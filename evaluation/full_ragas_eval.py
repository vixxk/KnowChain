#!/usr/bin/env python3
"""KnowChain RAG Evaluation Pipeline - Node.js Technical Guide"""
import os, json, requests, time, re
import openai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../backend/.env")
FW_KEY = os.environ.get("FIREWORKS_API_KEY")
API_URL = "http://localhost:5000/chat/query"
NODEJS_COL = "eval_nodejs_fixed_pdf_1778000117361"

fw = openai.OpenAI(api_key=FW_KEY, base_url="https://api.fireworks.ai/inference/v1")

DATASET = [
    {
        "question": "Who created Node.js and in what year?",
        "ground_truth": "Node.js was created by Ryan Dahl in 2009.",
        "collection": NODEJS_COL,
        "category": "Node.js - Introduction"
    },
    {
        "question": "What are some of the core modules in Node.js?",
        "ground_truth": "Node.js core modules include fs, http, path, os, events, stream, crypto, and child_process.",
        "collection": NODEJS_COL,
        "category": "Node.js - Core Modules"
    },
    {
        "question": "What are the six phases of the Node.js event loop?",
        "ground_truth": "The six phases of the event loop are timers, pending callbacks, idle/prepare, poll, check, and close callbacks.",
        "collection": NODEJS_COL,
        "category": "Node.js - Event Loop"
    },
    {
        "question": "What are the recommended HTTP methods for a REST API according to the guide?",
        "ground_truth": "The recommended HTTP methods are GET for reading, POST for creating, PUT for updating, and DELETE for removing.",
        "collection": NODEJS_COL,
        "category": "Node.js - REST API"
    },
    {
        "question": "What libraries are recommended for authentication and password hashing?",
        "ground_truth": "JSON Web Tokens (JWT) using the jsonwebtoken library are recommended for authentication, and bcrypt is recommended for password hashing.",
        "collection": NODEJS_COL,
        "category": "Node.js - Security"
    }
]

def query_rag(q, col):
    try:
        r = requests.post(API_URL, json={"query":q,"collectionName":col,"rewrite":False}, timeout=30)
        d = r.json()
        ans = d.get("answer","")
        # Strip citations and sources section
        ans = re.sub(r'\[Source \d+\]', '', ans)
        if '### Sources' in ans:
            ans = ans.split('### Sources')[0]
        if '---' in ans:
            ans = ans.split('---')[0]
        ans = ans.replace("**", "").replace("*", "").strip()
        ctx = d.get('debugContext', "")
        if not ctx:
            ctx = " ".join([s.get('preview','') for s in d.get('sources',[])])
        return ans, ctx
    except Exception as e:
        print(f"  ERR: {e}")
        return "",""

def judge(q, ans, ctx, gt):
    prompt = f"""/no_think
You are an expert RAG evaluator. Score this RAG response on 3 metrics (0.0 to 1.0).

QUESTION: {q}
CONTEXT RETRIEVED: {ctx}
RAG ANSWER: {ans}
GROUND TRUTH: {gt}

Score:
1. faithfulness: Is every claim in the answer supported by the retrieved context? (1.0 = perfectly grounded, 0.0 = hallucinated or unsupported claims)
2. relevancy: Does the answer directly address the question? (1.0 = highly relevant, 0.0 = off topic)
3. correctness: Does the answer match the ground truth factually? (1.0 = completely correct, 0.0 = completely wrong)

Give 1-sentence reasoning for each. Return ONLY valid JSON and no other text:
{{"faithfulness":0.0,"faithfulness_reason":"...","relevancy":0.0,"relevancy_reason":"...","correctness":0.0,"correctness_reason":"..."}}"""
    for attempt in range(3):
        try:
            r = fw.chat.completions.create(
                model="accounts/fireworks/models/deepseek-v4-pro",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a strict JSON-only evaluator. You must return ONLY a valid JSON object matching the requested schema. "
                            "Do NOT include any introduction, explanation, reasoning monologue, markdown code blocks (like ```json), or trailing text. "
                            "Your response must start with '{' and end with '}'."
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0, max_tokens=4096
            )
            raw = r.choices[0].message.content.strip()
            
            # Find the JSON block if there's text before/after
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                raw = match.group(0)
                
            return json.loads(raw)
        except Exception as e:
            print(f"  Judge attempt {attempt+1} failed: {str(e)[:80]}")
            if 'raw' in locals():
                print(f"  Raw output: {raw[:300]}")
            time.sleep(3)
    return {"faithfulness":0.0,"faithfulness_reason":"Error","relevancy":0.0,"relevancy_reason":"Error","correctness":0.0,"correctness_reason":"Error"}

def run():
    print("="*60)
    print("  KNOWCHAIN RAG EVALUATION PIPELINE (NODE.JS)")
    print("="*60)
    results = []
    for i, item in enumerate(DATASET):
        print(f"\n[{i+1}/{len(DATASET)}] {item['category']}")
        print(f"  Q: {item['question'][:60]}...")
        ans, ctx = query_rag(item['question'], item['collection'])
        if not ans:
            print("  SKIP: No answer")
            continue
        print(f"  A: {ans[:80].replace(chr(10), ' ')}...")
        time.sleep(2)
        scores = judge(item['question'], ans, ctx, item['ground_truth'])
        print(f"  F={scores['faithfulness']:.2f} R={scores['relevancy']:.2f} C={scores['correctness']:.2f}")
        results.append({"question":item['question'],"category":item['category'],"answer":ans,"context":ctx,"ground_truth":item['ground_truth'],**scores})
        time.sleep(2)
    return results

if __name__ == "__main__":
    results = run()
    if results:
        with open("evaluation_results.json","w") as f:
            json.dump(results, f, indent=2)
        print(f"\n{'='*60}")
        print(f"  DONE: {len(results)} questions scored")
        avg_f = sum(r['faithfulness'] for r in results)/len(results)
        avg_r = sum(r['relevancy'] for r in results)/len(results)
        avg_c = sum(r['correctness'] for r in results)/len(results)
        print(f"  Avg Faithfulness: {avg_f:.3f}")
        print(f"  Avg Relevancy:    {avg_r:.3f}")
        print(f"  Avg Correctness:  {avg_c:.3f}")
        print(f"{'='*60}")
