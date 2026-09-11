from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.evals.ragas_evaluator import RagasEvaluator
from app.observability.langsmith_logger import LangSmithLogger
from app.guardrails.nemo_guardrails import NeMoGuardrails

router = APIRouter(prefix="/evals", tags=["Evaluation & Observability"])

@router.get("/metrics")
async def get_all_metrics():
    try:
        eval_data = await RagasEvaluator.run_golden_evaluation_suite()
        obs_data = LangSmithLogger.get_observability_data()
        sec_report = NeMoGuardrails.get_full_security_report()

        return {
            "ragas_evals": eval_data["summary"],
            "security_evals": sec_report["summary"],
            "security_report": sec_report,
            "observability": obs_data,
            "samples": eval_data["samples"]
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )

@router.post("/run-benchmark")
async def run_benchmark():
    try:
        eval_data = await RagasEvaluator.run_golden_evaluation_suite()
        return {
            "message": "Golden Dataset Benchmark completed successfully.",
            "results": eval_data
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )
