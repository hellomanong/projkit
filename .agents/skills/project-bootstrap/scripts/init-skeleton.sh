#!/usr/bin/env bash
# 在目标目录创建 projkit 标准骨架。
# 用法: init-skeleton.sh <目标目录>
# 幂等: 已存在的目录和文件一律不覆盖，只补缺失的部分。
# 注意: 下方 DIRS 目录清单与 docs/PROJECT-GUIDE.md「目录一览」同源，改动需两边同步。

set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "错误: 必须指定目标目录" >&2
  echo "用法: $0 <目标目录>" >&2
  exit 1
fi

# 归一化为绝对路径：防止相对路径在多次调用间漂移，
# 也避免以连字符开头的目录名被 mkdir/cd 当成选项或触发 OLDPWD 语义。
# Git Bash 的盘符路径（C:/...、C:\...）和 UNC（//server/...）已是绝对路径，原样放行。
case "$TARGET" in
  /* | [A-Za-z]:/* | [A-Za-z]:\\*) ;;
  *) TARGET="$PWD/$TARGET" ;;
esac

mkdir -p "$TARGET"
cd "$TARGET"

created=()
skipped=()

# 全部标准目录，一律留空 + .gitkeep 占位。
# 占位文件必须是 .gitkeep 而非 .md——rules/agents/commands/output-styles
# 四个目录会把每个 .md 当成生效配置读取。
DIRS=(
  .agents/skills
  .codex/skills
  .claude/rules
  .claude/skills
  .claude/agents
  .claude/commands
  .claude/hooks
  .claude/output-styles
  .claude/agent-memory
  .claude/workflows
  docs
  docs/adr
  docs/architecture
  docs/prd
  docs/prd/解读
  docs/review
  specs
)

for d in "${DIRS[@]}"; do
  if [ -d "$d" ]; then
    skipped+=("$d/")
  else
    mkdir -p "$d"
    created+=("$d/")
  fi
  # docs/ 会放 PROJECT-GUIDE.md，不需要占位。
  # 判空忽略 .DS_Store——macOS 会悄悄生成它，否则目录被误判非空而丢掉 .gitkeep。
  # -H：目录本身是软链时跟随它判内容，避免把非空的链接目录误判为空、穿链塞 .gitkeep。
  if [ "$d" != "docs" ] && [ -z "$(find -H "$d" -mindepth 1 -maxdepth 1 -not -name '.DS_Store' -print -quit 2>/dev/null)" ]; then
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

# 校验: 扫描目录里不该有游离 .md（递归——commands/ 支持子目录命名空间，
# 如 commands/foo/bar.md 会生效为 /foo:bar 命令，只扫一层会漏）
strays=$(find .claude/rules .claude/agents .claude/commands .claude/output-styles \
           -name '*.md' 2>/dev/null || true)
if [ -n "$strays" ]; then
  echo "警告: 以下 .md 会被当成生效配置读取，确认是有意为之:" >&2
  echo "$strays" >&2
fi

echo "骨架就绪。settings.json / AGENTS.md（含 CLAUDE.md 软链）/ .gitignore / PROJECT-GUIDE.md 由 skill 后续步骤生成。"
