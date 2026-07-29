#!/usr/bin/env bash
# 在目标目录创建 projkit 标准骨架。
# 用法: init-skeleton.sh <目标目录>
# 幂等: 已存在的目录和文件一律不覆盖，只补缺失的部分。

set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "错误: 必须指定目标目录" >&2
  echo "用法: $0 <目标目录>" >&2
  exit 1
fi

mkdir -p "$TARGET"
cd "$TARGET"

created=()
skipped=()

# 全部标准目录，一律留空 + .gitkeep 占位。
# 占位文件必须是 .gitkeep 而非 .md——rules/agents/commands/output-styles
# 四个目录会把每个 .md 当成生效配置读取。
DIRS=(
  .claude/rules
  .claude/skills
  .claude/agents
  .claude/commands
  .claude/hooks
  .claude/output-styles
  .claude/agent-memory
  .claude/workflows
  docs
  specs
)

for d in "${DIRS[@]}"; do
  if [ -d "$d" ]; then
    skipped+=("$d/")
  else
    mkdir -p "$d"
    created+=("$d/")
  fi
  # docs/ 会放 PROJECT-GUIDE.md，不需要占位
  if [ "$d" != "docs" ] && [ -z "$(ls -A "$d" 2>/dev/null)" ]; then
    touch "$d/.gitkeep"
  fi
done

echo "目标目录: $(pwd)"
if [ ${#created[@]} -gt 0 ]; then
  printf '新建: %s\n' "${created[*]}"
fi
if [ ${#skipped[@]} -gt 0 ]; then
  printf '已存在(跳过): %s\n' "${skipped[*]}"
fi

# 校验: 扫描目录里不该有游离 .md
strays=$(find .claude/rules .claude/agents .claude/commands .claude/output-styles \
           -maxdepth 1 -name '*.md' 2>/dev/null || true)
if [ -n "$strays" ]; then
  echo "警告: 以下 .md 会被当成生效配置读取，确认是有意为之:" >&2
  echo "$strays" >&2
fi

echo "骨架就绪。settings.json / CLAUDE.md / .gitignore / PROJECT-GUIDE.md 由 skill 后续步骤生成。"
