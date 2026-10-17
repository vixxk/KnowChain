import os
import re
import asyncio
import mimetypes
from typing import Optional, Dict, Any, List
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError

from app.config import settings

class S3Service:
    def __init__(self):
        self._client = None

    @property
    def bucket_name(self) -> str:
        return settings.AWS_S3_BUCKET_NAME.strip()

    @property
    def region(self) -> str:
        return settings.AWS_REGION.strip() or "us-east-1"

    def is_configured(self) -> bool:
        """
        Returns True if AWS S3 bucket name is set and configured.
        """
        return bool(self.bucket_name)

    def get_client(self):
        """
        Initializes and returns a thread-safe boto3 S3 client.
        Supports explicit access keys, custom endpoints (MinIO/Localstack/R2),
        or default AWS IAM role / environment resolution.
        """
        if self._client is not None:
            return self._client

        boto_config = Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            s3={"addressing_style": "virtual"}
        )

        endpoint = settings.AWS_S3_ENDPOINT_URL.strip() or f"https://s3.{self.region}.amazonaws.com"

        client_kwargs = {
            "service_name": "s3",
            "region_name": self.region,
            "endpoint_url": endpoint,
            "config": boto_config
        }

        # Use explicit credentials if provided; otherwise boto3 resolves default chain / IAM role
        if settings.AWS_ACCESS_KEY_ID.strip() and settings.AWS_SECRET_ACCESS_KEY.strip():
            client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID.strip()
            client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY.strip()

        self._client = boto3.client(**client_kwargs)
        return self._client

    def _sanitize_filename(self, filename: str) -> str:
        basename = os.path.basename(filename)
        # Keep alphanumeric, dots, dashes, underscores
        clean = re.sub(r'[^a-zA-Z0-9._-]', '_', basename)
        return clean or "document.pdf"

    def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uploads file bytes directly to AWS S3 without saving locally.
        Returns a dict with S3 key, direct URL, presigned URL, and metadata.
        """
        if not self.is_configured():
            raise ValueError("AWS S3 bucket name is not configured in settings/env.")

        client = self.get_client()
        clean_name = self._sanitize_filename(filename)

        if session_id:
            safe_session = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id)
            key = f"uploads/{safe_session}/{clean_name}"
        else:
            key = f"uploads/{clean_name}"

        # Resolve content type
        if not content_type or content_type == "application/octet-stream":
            guessed_type, _ = mimetypes.guess_type(clean_name)
            content_type = guessed_type or "application/pdf"

        try:
            client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_content,
                ContentType=content_type
            )
            print(f"☁️ [S3] Uploaded {clean_name} ({len(file_content)} bytes) to s3://{self.bucket_name}/{key}")
        except (ClientError, BotoCoreError) as e:
            print(f"❌ [S3 Upload Error] Failed to upload {clean_name}: {e}")
            raise e

        # Determine public/standard S3 URL
        if settings.AWS_S3_ENDPOINT_URL.strip():
            base = settings.AWS_S3_ENDPOINT_URL.strip().rstrip("/")
            url = f"{base}/{self.bucket_name}/{key}"
        else:
            url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"

        presigned_url = self.generate_presigned_url(key)

        return {
            "key": key,
            "url": url,
            "presigned_url": presigned_url,
            "bucket": self.bucket_name,
            "filename": clean_name,
            "content_type": content_type,
            "size": len(file_content)
        }

    async def upload_file_async(
        self,
        file_content: bytes,
        filename: str,
        content_type: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Async wrapper for non-blocking file upload to S3.
        """
        return await asyncio.to_thread(
            self.upload_file,
            file_content,
            filename,
            content_type,
            session_id
        )

    def generate_presigned_url(self, key: str, expires_in: Optional[int] = None) -> Optional[str]:
        """
        Generates a temporary presigned URL for downloading/viewing a file from S3.
        """
        if not self.is_configured():
            return None

        client = self.get_client()
        expiry = expires_in or settings.AWS_S3_PRESIGNED_URL_EXPIRES

        try:
            url = client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": key
                },
                ExpiresIn=expiry
            )
            return url
        except Exception as e:
            print(f"⚠️ [S3 Presigned Error] Failed to generate presigned URL for {key}: {e}")
            return None

    def get_file_bytes(self, key: str) -> Optional[bytes]:
        """
        Downloads file bytes from S3.
        """
        if not self.is_configured():
            return None

        client = self.get_client()
        try:
            response = client.get_object(Bucket=self.bucket_name, Key=key)
            return response["Body"].read()
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "NoSuchKey":
                return None
            print(f"⚠️ [S3 Download Error] Failed to fetch {key}: {e}")
            return None

    async def get_file_bytes_async(self, key: str) -> Optional[bytes]:
        return await asyncio.to_thread(self.get_file_bytes, key)

    def object_exists(self, key: str) -> bool:
        """
        Checks whether an object exists in the S3 bucket.
        """
        if not self.is_configured() or not key:
            return False
        client = self.get_client()
        try:
            client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception:
            return False

    def find_object_key(self, path_or_filename: str) -> Optional[str]:
        """
        Finds the exact S3 key for a given path or filename.
        Tries:
        1. Exact key (e.g. 'uploads/session_xxx/doc.pdf')
        2. With 'uploads/' prefix (e.g. 'uploads/doc.pdf')
        3. Search under 'uploads/' matching the basename or sanitized basename
        """
        if not self.is_configured() or not path_or_filename:
            return None

        clean_path = path_or_filename.lstrip("/")

        # 1. Exact match
        if self.object_exists(clean_path):
            return clean_path

        # 2. Key with 'uploads/' prefix
        if not clean_path.startswith("uploads/"):
            candidate = f"uploads/{clean_path}"
            if self.object_exists(candidate):
                return candidate

        # 3. Match against objects in S3 by filename / basename
        basename = os.path.basename(clean_path)
        sanitized = self._sanitize_filename(basename)
        try:
            client = self.get_client()
            res = client.list_objects_v2(Bucket=self.bucket_name, Prefix="uploads/", MaxKeys=200)
            for obj in res.get("Contents", []):
                key = obj["Key"]
                if (key.endswith(f"/{basename}") or 
                    key.endswith(f"/{sanitized}") or 
                    key == f"uploads/{basename}" or 
                    key == f"uploads/{sanitized}"):
                    return key
        except Exception as e:
            print(f"⚠️ [S3 Key Lookup Error] {e}")

        return None

    def delete_file(self, key: str) -> bool:
        """
        Deletes a single file from S3.
        """
        if not self.is_configured():
            return False

        client = self.get_client()
        try:
            client.delete_object(Bucket=self.bucket_name, Key=key)
            print(f"🗑️ [S3] Deleted file: {key}")
            return True
        except Exception as e:
            print(f"⚠️ [S3 Delete Error] Failed to delete {key}: {e}")
            return False

    def delete_session_files(self, session_id: str) -> int:
        """
        Deletes all uploaded files stored under a session prefix:
        uploads/{session_id}/
        """
        if not self.is_configured() or not session_id:
            return 0

        client = self.get_client()
        safe_session = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id)
        prefix = f"uploads/{safe_session}/"

        try:
            paginator = client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)

            total_deleted = 0
            for page in pages:
                contents = page.get("Contents", [])
                if not contents:
                    continue

                objects_to_delete = [{"Key": obj["Key"]} for obj in contents]
                del_res = client.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={"Objects": objects_to_delete}
                )
                deleted_count = len(del_res.get("Deleted", []))
                total_deleted += deleted_count

            if total_deleted > 0:
                print(f"🧹 [S3 Cleanup] Deleted {total_deleted} files for session: {session_id}")
            return total_deleted
        except Exception as e:
            print(f"⚠️ [S3 Cleanup Error] Failed to cleanup files for session {session_id}: {e}")
            return 0

    async def delete_session_files_async(self, session_id: str) -> int:
        return await asyncio.to_thread(self.delete_session_files, session_id)

s3_service = S3Service()
