#!/usr/bin/env bash
set -euo pipefail

# needs jpegli: https://github.com/google/jpegli/issues/55#issuecomment-3752954719
# needs oxipng

DIST="${DIST:-1.0}"
SUBSAMP="${SUBSAMP:-444}"
MARK_XATTR="${MARK_XATTR:-1}"   # 1 = mark + skip already marked

XATTR_KEY="com.jpegli.optimized"

fd \
  --exclude node_modules \
  -e jpg -e jpeg -e png . \
  -x bash -c '
    set -euo pipefail

    in="$1"
    dist="$2"
    subsamp="$3"
    xkey="$4"
    mark="$5"

    # Skip if already marked (optimized or skipped)
    if [[ "$mark" == "1" ]] && xattr -p "$xkey" "$in" >/dev/null 2>&1; then
      echo "SKIP $in  (already marked)"
      exit 0
    fi

    ext="${in##*.}"
    ext="$(printf "%s" "$ext" | tr "[:upper:]" "[:lower:]")"

    orig_size=$(stat -f%z "$in")
    tmp="$(mktemp -t imgopt.XXXXXX)"

    tool_mark="unknown"

    if [[ "$ext" == "jpg" || "$ext" == "jpeg" ]]; then
      tmp="${tmp}.jpg"
      cjpegli "$in" "$tmp" -d "$dist" --chroma_subsampling="$subsamp" >/dev/null
      tool_mark="tool=cjpegli dist=$dist subsamp=$subsamp"

    elif [[ "$ext" == "png" ]]; then
      tmp="${tmp}.png"
      oxipng -Zao6 --strip all --out "$tmp" "$in" >/dev/null
      tool_mark="tool=oxipng args=-Zao6_stripall"

    else
      rm -f "$tmp" 2>/dev/null || true
      exit 0
    fi

    new_size=$(stat -f%z "$tmp")

    if [ "$new_size" -lt "$orig_size" ]; then
      mv -f "$tmp" "$in"
      saved=$((orig_size-new_size))
      msg="OK   $in  saved ${saved} bytes"
      markval="result=optimized saved_bytes=$saved orig_bytes=$orig_size new_bytes=$new_size $tool_mark"
    else
      rm -f "$tmp"
      msg="SKIP $in  (new >= old)"
      markval="result=skipped orig_bytes=$orig_size $tool_mark"
    fi

    # Mark either way (optimized OR skipped)
    if [[ "$mark" == "1" ]]; then
      xattr -w "$xkey" "$markval" "$in" 2>/dev/null || true
    fi

    echo "$msg"
  ' _ {} "$DIST" "$SUBSAMP" "$XATTR_KEY" "$MARK_XATTR"

echo 'done.'
