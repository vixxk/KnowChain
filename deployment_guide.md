# KnowChain FastAPI Backend AWS EC2 Deployment Guide (Nginx + sslip.io + SSL)

This guide provides step-by-step instructions for migrating from the legacy Node.js Express backend to the new **KnowChain Python FastAPI Backend (v2.0)** on an **AWS EC2** instance using **PM2**, **Nginx** as a reverse proxy, and **sslip.io** with **Certbot (Let's Encrypt)** for automated HTTPS/SSL configuration.

---

## 🏗️ Architecture Overview

```
[ Client / Frontend ]
          │ (HTTPS - Port 443)
          ▼
 [ EC2 Public IP: <IP>.sslip.io ]
          │
          ▼
   [ Nginx Reverse Proxy ] 
          │ (HTTP - Port 5000)
          ▼
 [ PM2 -> Uvicorn (FastAPI + LangGraph Backend) ]
```

---

## 📋 Prerequisites

- An active **AWS Account**.
- An **AWS EC2 Instance** (Ubuntu 22.04 LTS or 24.04 LTS recommended, `t3.medium` or higher recommended for RAG workloads).
- EC2 SSH Key Pair (`.pem` file).
- The public IP address of your EC2 instance (e.g., `54.210.45.12`).

---

## Step 1: Configure AWS Security Group

In the AWS EC2 Console, navigate to **Security Groups** for your instance and ensure the following inbound rules are enabled:

| Type | Protocol | Port Range | Source | Purpose |
|---|---|---|---|---|
| SSH | TCP | 22 | My IP (or `0.0.0.0/0`) | SSH Terminal Access |
| HTTP | TCP | 80 | `0.0.0.0/0` | HTTP Web Traffic & Certbot verification |
| HTTPS | TCP | 443 | `0.0.0.0/0` | Secure HTTPS Traffic |

> ⚠️ **Note:** Port `5000` does **not** need to be opened publicly. Nginx will route port `80` and `443` traffic internally to `127.0.0.1:5000`.

---

## Step 2: Connect to EC2 & Prepare Environment

1. Open your terminal and connect via SSH:
   ```bash
   ssh -i /path/to/your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```

2. Update system packages and install Python 3, venv & PM2:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y python3 python3-pip python3-venv build-essential git curl
   ```

3. Install Node.js (v20.x LTS) and **PM2** (used for process management):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```

---

## Step 3: Remove Old Node.js Backend & Deploy FastAPI Backend

1. Stop and remove the legacy Node.js process from PM2:
   ```bash
   pm2 stop knowchain-backend || true
   pm2 delete knowchain-backend || true
   pm2 save
   ```

2. Pull latest code from GitHub:
   ```bash
   cd /home/ubuntu/knowchain || cd /home/ubuntu/KnowChain
   git stash
   git pull origin main || git pull origin master
   ```

3. Navigate to `backend_fastapi` and set up Python Virtual Environment (`venv`):
   ```bash
   cd backend_fastapi
   python3 -m venv venv
   ./venv/bin/pip install --upgrade pip
   ./venv/bin/pip install -r requirements.txt
   ```

4. Create the `.env` configuration file:
   ```bash
   nano .env
   ```

5. Paste your environment variables (adjust values accordingly):
   ```env
   PORT=5000
   FIREWORKS_API_KEY=your_fireworks_api_key
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_api_key
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_langsmith_api_key
   LANGCHAIN_PROJECT=knowchain-observability
   ```
   *(Save and exit `nano`: press `Ctrl + O`, `Enter`, then `Ctrl + X`)*.

---

## Step 4: Start FastAPI Backend with PM2

1. Start Uvicorn / FastAPI server using PM2:
   ```bash
   pm2 start "venv/bin/uvicorn main:app --host 0.0.0.0 --port 5000" --name "knowchain-fastapi"
   ```

2. Verify that the FastAPI backend is online:
   ```bash
   pm2 status
   pm2 logs knowchain-fastapi --lines 20
   ```

3. Save PM2 state for automatic reboot recovery:
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Run the output command provided by `pm2 startup` if prompted).*

---

## Step 5: Install & Configure Nginx with sslip.io

`sslip.io` is a free DNS service that maps hostname IP addresses to the IP itself (e.g., `54.210.45.12.sslip.io` resolves automatically to `54.210.45.12`). This allows acquiring a valid SSL certificate via Let's Encrypt without buying a custom domain.

1. Install Nginx:
   ```bash
   sudo apt install -y nginx
   ```

2. Create a new Nginx configuration file for the backend:
   ```bash
   sudo nano /etc/nginx/sites-available/knowchain-backend
   ```

3. Add the following Nginx server configuration (replace `<YOUR_EC2_PUBLIC_IP>` with your actual IPv4 address, e.g., `54.210.45.12`):

   ```nginx
   server {
       listen 80;
       server_name <YOUR_EC2_PUBLIC_IP>.sslip.io;

       # Increase client upload size for document ingestion
       client_max_body_size 50M;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # Timeout settings for long-running LLM / RAG streams
           proxy_connect_timeout 300s;
           proxy_send_timeout 300s;
           proxy_read_timeout 300s;
       }
   }
   ```

4. Enable the new site by creating a symlink:
   ```bash
   sudo ln -s /etc/nginx/sites-available/knowchain-backend /etc/nginx/sites-enabled/
   ```

5. Remove default Nginx site configuration (optional but recommended):
   ```bash
   sudo rm -f /etc/nginx/sites-enabled/default
   ```

6. Test Nginx configuration and restart service:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## Step 6: Enable HTTPS / SSL using Certbot & sslip.io

1. Install **Certbot** and the Nginx plugin:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Request and install an SSL certificate for your `sslip.io` domain:
   ```bash
   sudo certbot --nginx -d <YOUR_EC2_PUBLIC_IP>.sslip.io
   ```
   - Enter your email when prompted.
   - Agree to the Terms of Service (`Y`).
   - Certbot will automatically verify ownership, update your Nginx configuration, and enable HTTPS redirect.

3. Verify automatic SSL renewal timer:
   ```bash
   sudo systemctl status certbot.timer
   sudo certbot renew --dry-run
   ```

---

## Step 7: Verify Backend Deployment

You can now test your backend server endpoints using `curl` or browser:

1. **Health Check Endpoint:**
   ```bash
   curl https://<YOUR_EC2_PUBLIC_IP>.sslip.io/health
   ```
   *Expected Response:*
   ```json
   {"status":"healthy","timestamp":"2026-09-01T15:37:19.000Z","uptime":123.45}
   ```

2. **Swagger Documentation Endpoint:**
   Visit in browser: `https://<YOUR_EC2_PUBLIC_IP>.sslip.io/api-docs`

3. **Base URL Route:**
   ```bash
   curl https://<YOUR_EC2_PUBLIC_IP>.sslip.io/
   ```
   *Expected Response:* `✅ KnowChain LLM Backend running`

---

## Step 8: Automated CI/CD Pipeline (GitHub Actions)

You can automate deployments so that whenever code is pushed to `main` or `master`, GitHub Actions automatically connects to your EC2 instance via SSH, pulls the latest code, installs dependencies, and restarts PM2.

### 1. Configure GitHub Repository Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add the following repository secrets:

| Secret Name | Value |
|---|---|
| `EC2_HOST` | Your EC2 Public IP address (e.g. `54.210.45.12`) |
| `EC2_USERNAME` | `ubuntu` |
| `EC2_PRIVATE_KEY` | Entire content of your `.pem` SSH key file (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) |

### 2. Workflow File Configuration

Create a file named `.github/workflows/deploy.yml` in your repository root with the following workflow:

```yaml
name: Deploy Backend to EC2

on:
  push:
    branches:
      - main
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_PRIVATE_KEY }}
          script: |
            # Navigate to the cloned repository
            cd ~/knowchain || cd ~/KnowChain
            
            # Discard any local changes and pull latest code
            git stash
            git pull origin main || git pull origin master
            
            # Stop & cleanup legacy Node.js PM2 backend process if active
            pm2 stop knowchain-backend || true
            pm2 delete knowchain-backend || true

            # Navigate to backend_fastapi, activate virtualenv and install dependencies
            cd backend_fastapi
            python3 -m venv venv
            ./venv/bin/pip install --upgrade pip
            ./venv/bin/pip install -r requirements.txt

            # Restart or start PM2 process for FastAPI server
            pm2 restart knowchain-fastapi || pm2 start "venv/bin/uvicorn main:app --host 0.0.0.0 --port 5000" --name "knowchain-fastapi"
            pm2 save
```

---

## 🛠️ Useful Operations & Maintenance

| Action | Command |
|---|---|
| View PM2 Logs | `pm2 logs knowchain-backend` |
| Restart Backend App | `pm2 restart knowchain-backend` |
| View Nginx Access Logs | `sudo tail -f /var/log/nginx/access.log` |
| View Nginx Error Logs | `sudo tail -f /var/log/nginx/error.log` |
| Test Nginx Syntax | `sudo nginx -t` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Check SSL Status | `sudo certbot certificates` |

---

## 🔒 Security Best Practices

1. **Keep `.env` Private:** Ensure `.env` is listed in `.gitignore` and never committed to Git.
2. **Restrict SSH:** Limit port 22 in AWS Security Group to your IP address.
3. **UFW Firewall (Optional):**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```
