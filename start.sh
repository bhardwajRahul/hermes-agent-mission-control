#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${REPO_ROOT}"

usage() {
  cat <<'EOF'
Usage:
  ./start.sh              Build and run Minions in production mode
  ./start.sh --dev        Run Minions in development mode
  ./start.sh --no-build   Skip build, run existing dist/ (production)
  ./start.sh --help       Show this help

Environment:
  MINIONS_HOME        State directory (default: ~/.minions)
  DB_PATH             SQLite database path (default: $MINIONS_HOME/data/minions.db)
  PORT                Web server port (default: 6969)
  MINIONS_NO_INSTALL  Set to 1 to skip automatic npm install
EOF
}

MODE="production"
SKIP_BUILD=0

for arg in "$@"; do
  case "${arg}" in
    --dev)
      MODE="development"
      ;;
    --no-build)
      SKIP_BUILD=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      usage >&2
      exit 1
      ;;
  esac
done

load_env_defaults() {
  local env_file="$1"
  local line key value

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"

    [[ -z "${line}" || "${line}" == \#* ]] && continue

    if [[ "${line}" == export[[:space:]]* ]]; then
      line="${line#export}"
      line="${line#"${line%%[![:space:]]*}"}"
    fi

    key="${line%%=*}"
    [[ "${key}" == "${line}" ]] && continue

    key="${key%"${key##*[![:space:]]}"}"
    [[ "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [[ -n "${!key+x}" ]] && continue

    value="${line#*=}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    case "${value}" in
      \"*\")
        value="${value:1:${#value}-2}"
        ;;
      \'*\')
        value="${value:1:${#value}-2}"
        ;;
    esac

    export "${key}=${value}"
  done < "${env_file}"
}

if [[ -f "${REPO_ROOT}/.env" ]]; then
  load_env_defaults "${REPO_ROOT}/.env"
fi

expand_home() {
  case "$1" in
    "~")
      printf '%s\n' "${HOME}"
      ;;
    "~/"*)
      printf '%s/%s\n' "${HOME}" "${1#~/}"
      ;;
    *)
      printf '%s\n' "$1"
      ;;
  esac
}

MINIONS_HOME="$(expand_home "${MINIONS_HOME:-${HOME}/.minions}")"
DB_PATH="$(expand_home "${DB_PATH:-${MINIONS_HOME}/data/minions.db}")"
PORT="${PORT:-6969}"

export MINIONS_HOME DB_PATH PORT

mkdir -p "${MINIONS_HOME}/data" "${MINIONS_HOME}/logs" "${MINIONS_HOME}/backups" "${MINIONS_HOME}/workspace" "$(dirname "${DB_PATH}")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run Minions." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to run Minions." >&2
  exit 1
fi

if [[ ! -d "${REPO_ROOT}/node_modules" ]]; then
  if [[ "${MINIONS_NO_INSTALL:-0}" == "1" ]]; then
    echo "node_modules is missing and MINIONS_NO_INSTALL=1 is set." >&2
    echo "Run npm install first." >&2
    exit 1
  fi
  npm install
fi

cat <<EOF
Minions starting
Mode: ${MODE}
URL: http://localhost:${PORT}
State: ${MINIONS_HOME}
Workspace: ${MINIONS_HOME}/workspace
Database: ${DB_PATH}
EOF

if [[ "${MODE}" == "development" ]]; then
  exec npm run dev
fi

if [[ "${SKIP_BUILD}" == "1" ]]; then
  if [[ ! -f dist/server/server/index.js ]]; then
    echo "dist/ not found. Run ./start.sh first to build, or remove --no-build." >&2
    exit 1
  fi
elif [[ -d dist ]]; then
  echo "Rebuilding..."
  npm run build
else
  npm run build
fi

exec npm run start
