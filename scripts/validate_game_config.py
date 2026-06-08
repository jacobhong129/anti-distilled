import json
import math
import sys
from pathlib import Path


VALID_STAGES = {"screening", "followup", "auxiliary", "split"}
OPTION_KEYS = {"A", "B", "C", "D"}


def fail(message):
    raise AssertionError(message)


def validate(path):
    config = json.loads(Path(path).read_text(encoding="utf-8"))
    metrics = set(config["scoreMetrics"])
    labels = set(config["labels"])
    label_details = set(config["labelDetails"])

    if config["version"] < "10.10":
        fail("config version must be 10.10 or later")

    items = config["items"]
    if len(items) != 120:
        fail(f"expected 120 items, got {len(items)}")

    if label_details != labels:
        missing = sorted(labels - label_details)
        extra = sorted(label_details - labels)
        fail(f"labelDetails must cover all labels; missing={missing}, extra={extra}")

    for index, item in enumerate(items):
        item_id = item.get("id", f"item_{index}")
        if item.get("stage") not in VALID_STAGES:
            fail(f"{item_id}: invalid stage {item.get('stage')}")

        options = item.get("options", [])
        if len(options) != 4:
            fail(f"{item_id}: expected 4 options, got {len(options)}")

        option_keys = {option.get("key") for option in options}
        if option_keys != OPTION_KEYS:
            fail(f"{item_id}: option keys must be A/B/C/D, got {sorted(option_keys)}")

        presentation = item.get("presentationOrder")
        if set(presentation or []) != OPTION_KEYS or len(presentation) != 4:
            fail(f"{item_id}: invalid presentationOrder {presentation}")

        if item.get("stage") == "split" and not item.get("splitBetween"):
            fail(f"{item_id}: split item missing splitBetween")

        for option in options:
            key = option["key"]
            scores = option.get("scores")
            evidence = option.get("evidence")
            label_delta = option.get("labelDelta")
            if not scores:
                fail(f"{item_id}.{key}: missing scores")
            if not evidence:
                fail(f"{item_id}.{key}: missing evidence")
            if not label_delta:
                fail(f"{item_id}.{key}: missing labelDelta")
            invalid_metrics = set(scores) - metrics
            if invalid_metrics:
                fail(f"{item_id}.{key}: invalid metrics {sorted(invalid_metrics)}")
            invalid_labels = set(label_delta) - labels
            if invalid_labels:
                fail(f"{item_id}.{key}: invalid labelDelta {sorted(invalid_labels)}")
            invalid_values = {
                label: value
                for label, value in label_delta.items()
                if not isinstance(value, (int, float)) or not math.isfinite(value)
            }
            if invalid_values:
                fail(f"{item_id}.{key}: invalid labelDelta values {invalid_values}")

    bands = config["resultBands"]
    ranges = sorted((band["min"], band["max"]) for band in bands)
    expected_start = 20
    for start, end in ranges:
        if start != expected_start:
            fail(f"resultBands gap or overlap before {start}; expected {expected_start}")
        expected_start = end + 1
    if expected_start != 101:
        fail("resultBands must cover through 100")

    for rule in config.get("labelExclusionRules", []):
        if rule.get("label") not in labels:
            fail(f"labelExclusionRules invalid label {rule.get('label')}")

    risk_rules = config.get("riskRules", {})
    if not risk_rules:
        fail("riskRules must not be empty")
    for name, rule in risk_rules.items():
        if not rule.get("trigger"):
            fail(f"riskRules.{name}: missing trigger")
        if not any(key in rule for key in ("routeTo", "countercheckFrom", "scoreEffect")):
            fail(f"riskRules.{name}: missing handling field")

    gate = config.get("appReadinessGate", {})
    if not gate.get("mustPassBeforePublicLaunch"):
        fail("appReadinessGate.mustPassBeforePublicLaunch must not be empty")

    return {
        "version": config["version"],
        "items": len(items),
        "options": sum(len(item["options"]) for item in items),
        "labelDeltaOptions": sum(
            1
            for item in items
            for option in item["options"]
            if option.get("labelDelta")
        ),
        "labels": len(labels),
        "riskRules": len(risk_rules),
        "readinessChecks": len(gate["mustPassBeforePublicLaunch"]),
    }


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "config/game-config-v10.10.json"
    result = validate(path)
    print("game config validation passed")
    for key, value in result.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
