"""Static validation for Community Work Management documentation baseline v1.5.0.

Run from any directory:
    python validation/validate_v1_5.py

This validates document/schema structure only. It does not test application runtime,
DB migrations, RLS enforcement, frontend builds, provider configuration or deployment.
"""
from pathlib import Path
import json, re
from ruamel.yaml import YAML
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
API_PATH = ROOT / "contracts/openapi-0.3.20-draft.yaml"
EVENTS_PATH = ROOT / "contracts/ws-events-0.3.20-draft.schema.json"
PROTO_PATH = ROOT / "contracts/ws-protocol.schema.json"
MASTER_PATH = ROOT / "Community-Work-Management-Master-Specification-v1.5.0.md"

checks, failures = [], []
def check(condition: bool, name: str) -> None:
    checks.append(name)
    if not condition:
        failures.append(name)

api = YAML(typ="safe").load(API_PATH.read_text())
schemas = api["components"]["schemas"]
ops = [op for item in api["paths"].values() for method, op in item.items()
       if method in {"get", "post", "put", "patch", "delete"}]
master = MASTER_PATH.read_text()

check(api["info"]["version"] == "0.3.20-draft", "OpenAPI version is 0.3.20-draft")
check(len(api["paths"]) == 95, "95 API paths")
check(len(ops) == 118, "118 API operations")
check(len(schemas) == 201, "201 OpenAPI schemas")
check(not any("/projects" in path.lower() for path in api["paths"]), "No active Project resource routes")
ids = [op.get("operationId") for op in ops]
check(None not in ids and len(ids) == len(set(ids)), "Unique operation IDs")

refs = []
def walk(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "$ref" and isinstance(value, str) and value.startswith("#/"):
                refs.append(value)
            walk(value)
    elif isinstance(obj, list):
        for value in obj:
            walk(value)
walk(api)
def pointer(obj, ref):
    current = obj
    for part in ref[2:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current
unresolved = []
for ref in refs:
    try:
        pointer(api, ref)
    except Exception:
        unresolved.append(ref)
check(not unresolved, "All local OpenAPI references resolve")

bad_parameters = []
for path, path_item in api["paths"].items():
    expected = set(re.findall(r"{([^}]+)}", path))
    for method, operation in path_item.items():
        if method not in {"get", "post", "put", "patch", "delete"}:
            continue
        actual = set()
        for parameter in operation.get("parameters", []):
            if "$ref" in parameter:
                try:
                    parameter = pointer(api, parameter["$ref"])
                except Exception:
                    continue
            if parameter.get("in") == "path":
                actual.add(parameter.get("name"))
        if expected - actual:
            bad_parameters.append((path, method, sorted(expected - actual)))
check(not bad_parameters, "All path-template parameters declared")

schema_errors = []
for name, schema in schemas.items():
    try:
        Draft202012Validator.check_schema(schema)
    except Exception as exc:
        schema_errors.append((name, str(exc)))
check(not schema_errors, "All component schemas valid Draft 2020-12 meta-schema")

ext = api
check(ext["x-task-key-resolution-policy"]["prefixRegistry"]["uniquenessScope"].startswith("Community"), "Community-unique prefix registry")
check("keyPrefix" in schemas["UpdateWorkspaceSettingsRequest"]["properties"], "Workspace owner can PATCH prefix")
check("WORKSPACE_KEY_PREFIX_ALREADY_IN_USE" in str(ext["x-task-key-resolution-policy"]), "Prefix collision error documented")
check(ext["x-workspace-template-policy"]["catalog"] == ["GENERAL_PURPOSE", "EVENT_PLANNING", "TEAM_OPERATIONS"], "Exactly 3 workspace templates")
check(len(ext["x-workspace-template-policy"]["builtIns"]) == 3, "Template seed definitions are concrete")
check("appliedTemplateKey" in schemas["WorkspaceDto"]["properties"] and "appliedTemplateVersion" in schemas["WorkspaceDto"]["properties"], "Workspace template provenance")
check("Workspace-level planning markers" in ext["x-workspace-milestone-policy"]["purpose"], "Milestones are optional Workspace-scoped markers")
check(schemas["WorkspaceDto"]["properties"]["maxSubtaskDepth"]["minimum"] == 1 and schemas["WorkspaceDto"]["properties"]["maxSubtaskDepth"]["maximum"] == 2, "Subtask depth 1–2")
workspace_patch = api["paths"]["/communities/{communityId}/workspaces/{workspaceId}"]["patch"]
check("MAX_SUBTASK_DEPTH_BELOW_CURRENT_TREE" in str(workspace_patch), "Unsafe subtask-depth reduction rejected")
check("itemType" not in schemas["TaskMovePreviewDto"]["properties"]["preservedFields"]["items"]["enum"], "Transfer excludes itemType")
check("targetParentTaskId=null" in ext["x-task-transfer-policy"]["parentBehavior"], "Transferred root must be top-level")
check(ext["x-workspace-trash-policy"]["recoverableWindowDays"] == 30 and ext["x-workspace-trash-policy"]["automaticPurge"] == "DISABLED", "30-day Trash with no automatic purge")
purge_path = "/communities/{communityId}/workspaces/{workspaceId}/trash/tasks/{taskId}/purge"
check(purge_path in api["paths"] and "PURGE_POLICY_NOT_ENABLED" in str(api["paths"][purge_path]["post"]), "Purge API remains gated pending DEC-OPEN-03")
check(ext["x-workspace-ownership-policy"]["multipleOwners"].startswith("Multiple active"), "Multiple Workspace Owners supported")
check("at transaction commit" in ext["x-workspace-ownership-policy"]["floor"], "At least one active Owner invariant")
check(api["paths"]["/communities/{communityId}/workspace-templates"]["get"]["security"] == [{"sessionCookie": []}], "Template catalog route uses defined session cookie scheme")

realtime = json.loads(EVENTS_PATH.read_text())
openapi_events = schemas["WorkspaceStreamEvent"]["properties"]["eventType"]["enum"]
realtime_events = realtime["$defs"]["workspaceStreamEvent"]["properties"]["eventType"]["enum"]
check(set(openapi_events) == set(realtime_events) and len(openapi_events) == 31, "Realtime schema matches 31 OpenAPI event types")

for dec in ["06", "07", "08", "09", "10", "11", "15"]:
    marker = f"| DEC-OPEN-{dec} |"
    position = master.find(marker)
    check(position >= 0 and "OWNER CONFIRMED" in master[position:position + 1000], f"DEC-OPEN-{dec} owner-confirmed in register")
for dec in ["03", "04", "05", "12", "13", "14"]:
    check(f"DEC-OPEN-{dec}" in master and "remain open" in master.lower(), f"DEC-OPEN-{dec} remains in open decision set")
check("API `0.3.20-draft` is not contract-frozen" in master, "Master says API is not frozen")
check("three built-in workspace setup templates" in (DOCS / "01-product/master-prd.md").read_text().lower(), "PRD includes approved three templates")
check("High-risk acceptance scenarios" in master and "25. Multiple Shared Workspace Owners" in master, "Master includes approved-decision acceptance scenarios")

all_files = [p for p in DOCS.rglob("*") if p.is_file()]
check(len(all_files) >= 35, "At least 35 split documentation/artifact files")
check((DOCS / "contracts/openapi.yaml").read_bytes() == API_PATH.read_bytes(), "Split OpenAPI is exact copy")
check((DOCS / "contracts/ws-events.schema.json").read_bytes() == EVENTS_PATH.read_bytes(), "Split event schema is exact copy")
check((DOCS / "contracts/ws-protocol.schema.json").read_bytes() == PROTO_PATH.read_bytes(), "Split protocol schema is exact copy")
for rel in ["01-product/master-prd.md", "03-architecture/domain-model-and-database.md", "04-implementation/frontend-antigravity-blueprint.md", "04-implementation/backend-integration-blueprint.md", "04-implementation/phased-vertical-slices.md"]:
    check((DOCS / rel).stat().st_size > 4000, f"{rel} contains substantive section content")

report = {
    "baseline": "1.5.0",
    "approval_date": "2026-10-31",
    "api_version": api["info"]["version"],
    "inventory": {
        "paths": len(api["paths"]), "operations": len(ops), "schemas": len(schemas),
        "workspace_event_types": len(openapi_events), "split_document_files": len(all_files)
    },
    "checks_total": len(checks),
    "checks_passed": len(checks) - len(failures),
    "failures": failures,
    "check_names": checks,
    "not_run": [
        "official Redocly/OpenAPI lint", "generated TypeScript client validation", "backend runtime",
        "frontend typecheck/build", "database migration execution", "RLS integration tests",
        "runtime auth/permission/realtime tests", "load/performance tests", "provider provisioning",
        "backup/PITR configuration", "restore drill", "joint FE/BE/Security contract sign-off"
    ],
    "status": "STATIC DOCUMENT/SCHEMA VALIDATION ONLY; NOT CONTRACT FREEZE OR APPLICATION RUNTIME EVIDENCE"
}
report_path = ROOT / "validation/master-v1.5-validation-report.json"
report_path.write_text(json.dumps(report, indent=2) + "\n")
(DOCS / "validation/master-v1.5-validation-report.json").write_text(report_path.read_text())
print(json.dumps(report, indent=2))
if failures:
    raise SystemExit(1)
