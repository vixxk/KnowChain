#!/usr/bin/env python3
"""Generate a detailed RAG Evaluation PDF Report from evaluation_results.json"""
import json, os, datetime
from fpdf import FPDF

def clean(text):
    if not text: return "N/A"
    try:
        t = str(text)
        for old, new in [('\u2013','-'),('\u2014','-'),('\u2019',"'"),('\u2018',"'"),('\u201c','"'),('\u201d','"'),('\u2022','-'),('\u25e6','-'),('\u2026','...'),('\u00e9','e')]:
            t = t.replace(old, new)
        return t.encode('latin-1', 'ignore').decode('latin-1')
    except:
        return str(text)[:200]

class ReportPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            return
        # Dark navy header bar
        self.set_fill_color(15, 23, 42)
        self.rect(0, 0, 210, 45, 'F')
        # Gold accent line
        self.set_fill_color(212, 175, 55)
        self.rect(0, 45, 210, 2, 'F')
        # Title
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(255, 255, 255)
        self.set_y(10)
        self.cell(0, 12, "KNOWCHAIN RAG PERFORMANCE AUDIT", align="C")
        self.ln(12)
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(212, 175, 55)
        self.cell(0, 8, "Comprehensive Evaluation Report | RAGAS Framework Metrics", align="C")
        self.ln(25)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"KnowChain Intelligence Audit | Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(15, 23, 42)
        self.set_fill_color(241, 245, 249)
        self.cell(0, 10, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def safe_cell(self, w, h, txt, **kwargs):
        self.cell(w, h, clean(txt), **kwargs)

    def safe_multi(self, w, h, txt):
        self.set_x(self.l_margin)
        self.multi_cell(w, h, clean(txt), new_x="LMARGIN", new_y="NEXT")

def color_for_score(score):
    if score >= 0.8: return (22, 163, 74)    # Green
    elif score >= 0.5: return (202, 138, 4)   # Amber
    else: return (220, 38, 38)                 # Red

def grade_label(score):
    if score >= 0.9: return "Excellent"
    elif score >= 0.8: return "Good"
    elif score >= 0.6: return "Fair"
    elif score >= 0.4: return "Needs Work"
    else: return "Critical"

def generate_pdf(results):
    pdf = ReportPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    n = len(results)
    avg_f = sum(r['faithfulness'] for r in results) / n
    avg_r = sum(r['relevancy'] for r in results) / n
    avg_c = sum(r['correctness'] for r in results) / n
    overall = (avg_f + avg_r + avg_c) / 3

    # ── PAGE 1: EXECUTIVE SUMMARY ──
    pdf.add_page()
    pdf.section_title("1. EXECUTIVE SUMMARY")

    # Meta info
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(71, 85, 105)
    now = datetime.datetime.now().strftime("%B %d, %Y at %I:%M %p")
    pdf.cell(0, 6, f"Report Generated: {now}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Test Dataset: {n} human-crafted questions across 2 document types", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "LLM Judge: Fireworks AI Qwen3-8B | RAG Backend: KnowChain v2.0", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Evaluation Framework: RAGAS-aligned (Faithfulness, Relevancy, Correctness)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Overall score box
    current_y = pdf.get_y()
    pdf.set_fill_color(15, 23, 42)
    pdf.rect(15, current_y, 180, 25, 'F')
    
    pdf.set_y(current_y + 8)
    pdf.set_x(20)
    
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(85, 9, "OVERALL PERFORMANCE SCORE", align="L")
    
    r2, g2, b2 = color_for_score(overall)
    pdf.set_text_color(r2, g2, b2) if overall >= 0.5 else pdf.set_text_color(220, 38, 38)
    pdf.set_font("Helvetica", "B", 22)
    pdf.cell(85, 9, f"{overall:.2f}  ({grade_label(overall)})", align="R")
    
    pdf.set_y(current_y + 35)

    # Score table
    pdf.set_text_color(15, 23, 42)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_fill_color(226, 232, 240)
    pdf.cell(60, 10, "  METRIC", 1, 0, 'L', True)
    pdf.cell(30, 10, "SCORE", 1, 0, 'C', True)
    pdf.cell(30, 10, "GRADE", 1, 0, 'C', True)
    pdf.cell(70, 10, "  INTERPRETATION", 1, 1, 'L', True)

    metrics = [
        ("Faithfulness", avg_f, "Grounding in retrieved context"),
        ("Answer Relevancy", avg_r, "Addresses user's question directly"),
        ("Answer Correctness", avg_c, "Matches ground truth factually"),
    ]
    for label, val, desc in metrics:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(60, 10, f"  {label}", 1, 0, 'L')
        r2, g2, b2 = color_for_score(val)
        pdf.set_text_color(r2, g2, b2)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(30, 10, f"{val:.2f}", 1, 0, 'C')
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(30, 10, grade_label(val), 1, 0, 'C')
        pdf.set_text_color(71, 85, 105)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(70, 10, f"  {desc}", 1, 1, 'L')
        pdf.set_text_color(15, 23, 42)

    pdf.ln(8)

    # ── METRIC DEFINITIONS ──
    pdf.section_title("2. METRIC DEFINITIONS (RAGAS Framework)")
    defs = [
        ("Faithfulness (Grounding Score)", "Measures whether every claim in the RAG-generated answer is directly supported by the retrieved context chunks. A score of 1.0 means zero hallucination - every statement can be traced back to the source documents. A score of 0.0 means the answer fabricates information not present in the context."),
        ("Answer Relevancy", "Evaluates how well the generated answer addresses the user's original question. A perfectly relevant answer (1.0) directly and completely answers what was asked. Low scores indicate off-topic responses, partial answers, or unnecessary information that dilutes the response."),
        ("Answer Correctness", "Compares the factual content of the RAG answer against a human-verified ground truth. This metric catches cases where the answer is grounded in context but the context itself is wrong or incomplete. A score of 1.0 means perfect factual alignment with the expected answer."),
    ]
    for title, desc in defs:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 7, f"  {title}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(71, 85, 105)
        pdf.safe_multi(185, 5, f"  {desc}")
        pdf.ln(3)

    # ── PAGE 2+: CATEGORY BREAKDOWN ──
    pdf.add_page()
    pdf.section_title("3. PERFORMANCE BY CATEGORY")

    categories = {}
    for r in results:
        cat = r['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(r)

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(226, 232, 240)
    pdf.cell(60, 9, "  CATEGORY", 1, 0, 'L', True)
    pdf.cell(20, 9, "COUNT", 1, 0, 'C', True)
    pdf.cell(30, 9, "FAITH.", 1, 0, 'C', True)
    pdf.cell(30, 9, "RELEV.", 1, 0, 'C', True)
    pdf.cell(30, 9, "CORRECT.", 1, 0, 'C', True)
    pdf.cell(20, 9, "AVG", 1, 1, 'C', True)

    for cat, items in categories.items():
        cf = sum(i['faithfulness'] for i in items)/len(items)
        cr = sum(i['relevancy'] for i in items)/len(items)
        cc = sum(i['correctness'] for i in items)/len(items)
        ca = (cf+cr+cc)/3
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(60, 8, f"  {clean(cat)}", 1, 0, 'L')
        pdf.cell(20, 8, str(len(items)), 1, 0, 'C')
        for v in [cf, cr, cc, ca]:
            r2, g2, b2 = color_for_score(v)
            pdf.set_text_color(r2, g2, b2)
            pdf.cell(30 if v != ca else 20, 8, f"{v:.2f}", 1, 0, 'C')
        pdf.set_text_color(15, 23, 42)
        pdf.ln()

    pdf.ln(8)

    # ── DETAILED QUESTION-BY-QUESTION ──
    pdf.section_title("4. DETAILED QUESTION-BY-QUESTION ANALYSIS")
    pdf.ln(3)

    for i, r in enumerate(results):
        if pdf.get_y() > 200:
            pdf.add_page()

        # Question header bar
        pdf.set_fill_color(30, 41, 59)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 8, f"  TEST CASE {i+1}: {clean(r['category'])}", fill=True, new_x="LMARGIN", new_y="NEXT")

        # Score badges inline
        pdf.set_font("Helvetica", "B", 9)
        scores_line = f"  Faithfulness: {r['faithfulness']:.2f}  |  Relevancy: {r['relevancy']:.2f}  |  Correctness: {r['correctness']:.2f}"
        avg_s = (r['faithfulness']+r['relevancy']+r['correctness'])/3
        r2, g2, b2 = color_for_score(avg_s)
        pdf.set_text_color(r2, g2, b2)
        pdf.set_fill_color(248, 250, 252)
        pdf.cell(0, 7, scores_line, fill=True, new_x="LMARGIN", new_y="NEXT")

        # Question
        pdf.set_text_color(15, 23, 42)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 6, "  QUESTION:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(51, 65, 85)
        pdf.safe_multi(185, 5, f"  {r['question']}")

        # RAG Answer
        pdf.set_text_color(15, 23, 42)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 6, "  RAG ANSWER:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(51, 65, 85)
        ans_clean = clean(r['answer'])[:600]
        pdf.safe_multi(185, 4, f"  {ans_clean}")

        # Ground Truth
        pdf.set_text_color(22, 163, 74)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 6, "  GROUND TRUTH (Expected Answer):", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 8)
        pdf.safe_multi(185, 4, f"  {r['ground_truth']}")

        # Retrieved Context snippet
        pdf.set_text_color(100, 116, 139)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 6, "  RETRIEVED CONTEXT (Chunk Preview):", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 7)
        ctx_clean = clean(r.get('context','N/A'))[:400]
        pdf.safe_multi(185, 4, f"  {ctx_clean}")

        # Judge Reasoning
        pdf.set_text_color(15, 23, 42)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 6, "  LLM JUDGE REASONING:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(71, 85, 105)
        fr = clean(r.get('faithfulness_reason','N/A'))
        rr = clean(r.get('relevancy_reason','N/A'))
        cr = clean(r.get('correctness_reason','N/A'))
        pdf.safe_multi(185, 4, f"  Faithfulness: {fr}")
        pdf.safe_multi(185, 4, f"  Relevancy: {rr}")
        pdf.safe_multi(185, 4, f"  Correctness: {cr}")

        pdf.ln(6)

    # ── FINDINGS & RECOMMENDATIONS ──
    if pdf.get_y() > 200:
        pdf.add_page()

    pdf.section_title("5. KEY FINDINGS & RECOMMENDATIONS")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(51, 65, 85)

    findings = []
    if avg_f < 0.5:
        findings.append("CRITICAL - Low Faithfulness: The RAG system frequently generates claims not supported by retrieved context. This indicates hallucination. Consider increasing chunk overlap, retrieval count (k), or switching to a more grounded LLM.")
    elif avg_f < 0.8:
        findings.append("WARNING - Moderate Faithfulness: Some answers contain unsupported claims. Review chunk sizing and consider adding a post-retrieval verification step.")
    else:
        findings.append("GOOD - High Faithfulness: Answers are well-grounded in retrieved context with minimal hallucination.")

    if avg_r < 0.5:
        findings.append("CRITICAL - Low Relevancy: Answers frequently miss the user's intent. Consider query rewriting, better prompt engineering, or improved retrieval strategies.")
    elif avg_r < 0.8:
        findings.append("WARNING - Moderate Relevancy: Some answers are partially relevant. Fine-tune the system prompt to focus responses on the exact question asked.")
    else:
        findings.append("GOOD - High Relevancy: Answers consistently address user questions directly.")

    if avg_c < 0.5:
        findings.append("CRITICAL - Low Correctness: Answers deviate significantly from ground truth. This may indicate poor document indexing, insufficient chunk coverage, or retrieval failures.")
    elif avg_c < 0.8:
        findings.append("WARNING - Moderate Correctness: Some factual gaps exist. Consider increasing retrieval depth or improving document preprocessing.")
    else:
        findings.append("GOOD - High Correctness: Answers align closely with verified ground truth.")

    for f in findings:
        severity = f.split(" - ")[0]
        if "CRITICAL" in severity:
            pdf.set_text_color(220, 38, 38)
        elif "WARNING" in severity:
            pdf.set_text_color(202, 138, 4)
        else:
            pdf.set_text_color(22, 163, 74)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(5, 6, "-")
        pdf.set_font("Helvetica", "", 9)
        pdf.safe_multi(180, 5, f" {f}")
        pdf.ln(2)

    # ── TEST DATASET APPENDIX ──
    pdf.add_page()
    pdf.section_title("6. APPENDIX: COMPLETE TEST DATASET")
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 6, f"Total test cases: {n} | Categories: {len(categories)} | Source documents: Resume PDF, Agreement PDF", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(226, 232, 240)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(8, 7, "#", 1, 0, 'C', True)
    pdf.cell(32, 7, "Category", 1, 0, 'C', True)
    pdf.cell(70, 7, "Question", 1, 0, 'C', True)
    pdf.cell(15, 7, "F", 1, 0, 'C', True)
    pdf.cell(15, 7, "R", 1, 0, 'C', True)
    pdf.cell(15, 7, "C", 1, 0, 'C', True)
    pdf.cell(15, 7, "Avg", 1, 0, 'C', True)
    pdf.cell(20, 7, "Grade", 1, 1, 'C', True)

    for i, r in enumerate(results):
        avg_s = (r['faithfulness']+r['relevancy']+r['correctness'])/3
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(8, 6, str(i+1), 1, 0, 'C')
        cat_short = clean(r['category']).replace("Resume - ","R:").replace("Agreement - ","A:")
        pdf.cell(32, 6, cat_short, 1, 0, 'L')
        q_short = clean(r['question'])[:45]
        pdf.cell(70, 6, q_short, 1, 0, 'L')
        for v in [r['faithfulness'], r['relevancy'], r['correctness']]:
            cr, cg, cb = color_for_score(v)
            pdf.set_text_color(cr, cg, cb)
            pdf.cell(15, 6, f"{v:.2f}", 1, 0, 'C')
        cr, cg, cb = color_for_score(avg_s)
        pdf.set_text_color(cr, cg, cb)
        pdf.cell(15, 6, f"{avg_s:.2f}", 1, 0, 'C')
        pdf.set_font("Helvetica", "B", 7)
        pdf.cell(20, 6, grade_label(avg_s), 1, 1, 'C')

    pdf.ln(8)
    pdf.set_text_color(150, 150, 150)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 6, "End of Report. Generated by KnowChain RAG Evaluation Pipeline.", align="C")

    output_path = "KnowChain_RAG_Evaluation_Report.pdf"
    pdf.output(output_path)
    print(f"PDF saved: {os.path.abspath(output_path)}")
    return output_path

if __name__ == "__main__":
    with open("evaluation_results.json") as f:
        results = json.load(f)
    print(f"Loaded {len(results)} evaluation results")
    generate_pdf(results)
