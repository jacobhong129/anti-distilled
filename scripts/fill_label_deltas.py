import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATHS = [
    ROOT / "config" / "game-config-v10.10.json",
    ROOT / "web" / "data" / "game-config.json",
]

TYPE_HINTS = {
    "process_execution": {
        "skill_friendly": 0.1,
        "method_distilled": 0.04,
    },
    "condition_clarification": {
        "teachable_irreplaceable": 0.07,
        "method_distilled": 0.05,
        "context_reader": 0.03,
    },
    "mature_judgment": {
        "boundary_radar": 0.06,
        "teachable_irreplaceable": 0.05,
        "high_density_human": 0.03,
    },
    "intuition_or_countercheck": {
        "intuition_grounded": 0.07,
        "boundary_radar": 0.03,
    },
}

METRIC_HINTS = {
    "CXT": {"context_reader": 0.045, "relationship_stabilizer": 0.02},
    "BND": {"boundary_radar": 0.052, "teachable_irreplaceable": 0.015},
    "GEN": {"generative_reframer": 0.055},
    "TST": {"empty_professional_detector": 0.045, "taste_low_expression": 0.018},
    "STN": {"value_low_generation": 0.05, "relationship_stabilizer": 0.018},
    "GRD": {"grounded_experience": 0.05, "intuition_grounded": 0.032},
    "SKL": {"skill_friendly": 0.052, "method_distilled": 0.028},
    "EXP": {"expressive_high": 0.045, "teachable_irreplaceable": 0.025, "method_distilled": 0.02},
    "NOI": {"fake_resistance": 0.085},
    "TLB": {"ai_amplified_professional": 0.075},
}

EVIDENCE_HINTS = {
    "standardizable_work": {"skill_friendly": 0.12},
    "fixed_process_and_format": {"skill_friendly": 0.14},
    "process_execution": {"skill_friendly": 0.035},
    "skl_signal": {"skill_friendly": 0.035, "method_distilled": 0.02},
    "common_issue_playbook": {"method_distilled": 0.12, "skill_friendly": 0.06},
    "reusable_method": {"method_distilled": 0.14},
    "judgment_framework_with_exceptions": {"teachable_irreplaceable": 0.12},
    "condition_clarification": {"teachable_irreplaceable": 0.035},
    "bnd_signal": {"boundary_radar": 0.035},
    "boundary_signal": {"boundary_radar": 0.1},
    "context_boundary_tradeoff": {"boundary_radar": 0.1, "context_reader": 0.04},
    "failure_boundary": {"intuition_grounded": 0.08, "grounded_experience": 0.08, "boundary_radar": 0.04},
    "risk_with_alternative": {"value_low_generation": 0.1, "boundary_radar": 0.05},
    "condition_check": {"boundary_radar": 0.06, "context_reader": 0.04},
    "context_signal": {"context_reader": 0.08, "relationship_stabilizer": 0.06},
    "pause_to_identify_reason": {"relationship_stabilizer": 0.1, "context_reader": 0.06},
    "audience_need_check": {"context_reader": 0.08},
    "expression_signal": {"expressive_high": 0.08, "relationship_stabilizer": 0.04},
    "partly_translated_judgment": {"expressive_low": 0.08, "expressive_high": 0.04},
    "expression_lag": {"expressive_low": 0.12, "taste_low_expression": 0.08},
    "ai_amplifier": {"ai_amplified_professional": 0.16},
    "ai_as_option_expander": {"ai_amplified_professional": 0.12},
    "tool_boundary": {"ai_amplified_professional": 0.14, "boundary_radar": 0.05},
    "judgment_reserved": {"ai_amplified_professional": 0.08, "value_low_generation": 0.04},
    "ai_options_human_decision": {"ai_amplified_professional": 0.14},
    "ai_challenges_but_human_decides": {"ai_amplified_professional": 0.14},
    "ai_direction_boundary": {"ai_amplified_professional": 0.1, "boundary_radar": 0.05},
    "ai_goal_check": {"ai_amplified_professional": 0.09, "context_reader": 0.03},
    "ai_failure_point": {"ai_amplified_professional": 0.08, "boundary_radar": 0.06},
    "anti_empty_professionalism": {"empty_professional_detector": 0.16},
    "cliche_without_judgment": {"empty_professional_detector": 0.16},
    "empty_but_polished_detected": {"empty_professional_detector": 0.16},
    "ai_empty_judgment_check": {"empty_professional_detector": 0.16},
    "correct_but_empty_words": {"empty_professional_detector": 0.12},
    "judgment_selection_gap": {"empty_professional_detector": 0.1, "generative_reframer": 0.06},
    "smooth_without_source_or_tradeoff": {"empty_professional_detector": 0.1, "fake_resistance": 0.04},
    "posture_hiding_low_judgment": {"fake_resistance": 0.12, "empty_professional_detector": 0.08},
    "simple_judgment_overpackaged": {"empty_professional_detector": 0.1},
    "problem_reframed": {"generative_reframer": 0.14},
    "practical_rework": {"generative_reframer": 0.12, "value_low_generation": 0.04},
    "target_relevance_cleanup": {"generative_reframer": 0.09, "context_reader": 0.04},
    "surface_overdecorated": {"fake_resistance": 0.08, "taste_low_expression": 0.04},
    "audience_overload": {"fake_resistance": 0.06, "context_reader": 0.04},
    "value_signal": {"value_low_generation": 0.1, "relationship_stabilizer": 0.03},
    "compliance_first": {"value_low_generation": 0.08, "skill_friendly": 0.03},
    "judgment_and_consequence": {"value_low_generation": 0.08, "boundary_radar": 0.04},
    "specific_experience": {"grounded_experience": 0.12, "intuition_grounded": 0.08},
    "case_validated": {"grounded_experience": 0.12, "intuition_grounded": 0.08},
    "data_validated": {"grounded_experience": 0.08, "method_distilled": 0.04},
    "failure_refined_judgment": {"grounded_experience": 0.1, "intuition_grounded": 0.08},
    "updates_judgment_conditions": {"intuition_grounded": 0.1, "grounded_experience": 0.06},
    "knows_experience_failure_boundary": {"intuition_grounded": 0.1, "grounded_experience": 0.06},
    "old_method_continues": {"experience_locked": 0.12},
    "rarely_update_experience": {"experience_locked": 0.16},
    "old_experience_rejected_broadly": {"fake_resistance": 0.08, "experience_locked": 0.04},
    "rejects_old_experience_by_feeling": {"fake_resistance": 0.08},
    "ai_vibe_discomfort": {"fake_resistance": 0.08},
    "ai_smoothness_suspicion": {"empty_professional_detector": 0.08, "fake_resistance": 0.04},
    "noi_signal": {"fake_resistance": 0.055},
}

PRIMARY_FALLBACK = {
    "CXT": "context_reader",
    "BND": "boundary_radar",
    "GEN": "generative_reframer",
    "TST": "empty_professional_detector",
    "STN": "value_low_generation",
    "GRD": "grounded_experience",
    "SKL": "skill_friendly",
    "EXP": "expressive_high",
    "NOI": "fake_resistance",
    "TLB": "ai_amplified_professional",
}


def add(scores, label, value):
    if not value:
        return
    scores[label] = scores.get(label, 0.0) + value


def inferred_delta(item, option, labels):
    scores = {}
    for label, value in TYPE_HINTS.get(option.get("type"), {}).items():
        add(scores, label, value)

    for metric, metric_score in (option.get("scores") or {}).items():
        for label, weight in METRIC_HINTS.get(metric, {}).items():
            add(scores, label, metric_score * weight)

    for evidence in option.get("evidence") or []:
        for label, value in EVIDENCE_HINTS.get(evidence, {}).items():
            add(scores, label, value)

    split_between = item.get("splitBetween") or []
    for label in split_between:
        add(scores, label, 0.08)

    primary = item.get("primaryMetric")
    fallback = PRIMARY_FALLBACK.get(primary)
    if fallback:
        add(scores, fallback, 0.045)

    if option.get("type") == "intuition_or_countercheck" and (option.get("scores") or {}).get("NOI", 0) > 0:
        add(scores, "fake_resistance", 0.04)

    filtered = {label: value for label, value in scores.items() if label in labels and value > 0.035}
    if not filtered and fallback:
        filtered[fallback] = 0.06

    ranked = sorted(filtered.items(), key=lambda item: (-item[1], item[0]))[:3]
    return {label: round(min(value, 0.24), 2) for label, value in ranked}


def fill_config(path):
    config = json.loads(path.read_text(encoding="utf-8"))
    labels = set(config["labels"])
    filled = 0
    for item in config["items"]:
        for option in item["options"]:
            if option.get("labelDelta"):
                continue
            option["labelDelta"] = inferred_delta(item, option, labels)
            filled += 1
    path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return filled


def main():
    paths = [Path(arg) for arg in sys.argv[1:]] if len(sys.argv) > 1 else DEFAULT_PATHS
    for path in paths:
        filled = fill_config(path)
        print(f"{path}: filled {filled} missing labelDelta entries")


if __name__ == "__main__":
    main()
