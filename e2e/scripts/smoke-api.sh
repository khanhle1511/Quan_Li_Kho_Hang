#!/bin/bash
# Smoke test API bằng curl – chạy sau khi ứng dụng đã khởi động.
#   ./e2e/scripts/smoke-api.sh                             # local http://localhost:8080
#   BASE=http://localhost:8099 ./e2e/scripts/smoke-api.sh   # cổng khác
# Lưu ý: kịch bản này GHI dữ liệu (lập phiếu, duyệt, kiểm kê, tạo kho/tài khoản rồi xóa).
# Chỉ chạy trên local hoặc CSDL riêng, không chạy trên bản demo dùng chung.
B="${BASE:-http://localhost:8080}"
T="$(mktemp -d)"
J1="$T/c_mgr"; J2="$T/c_adm"; J3="$T/c_staff"
PASS=0; FAIL=0
req() { # method url [cookiejar] [json]
  local m=$1 u=$2 c=${3:-} d=${4:-}
  local args=(-s -X "$m" "$B$u")
  [ -n "$c" ] && args+=(-b "$c" -c "$c")
  [ -n "$d" ] && args+=(-H "Content-Type: application/json" -d "$d")
  curl "${args[@]}"
}
check() { # tên  chuỗi-phải-có  output
  if echo "$3" | grep -q -- "$2"; then PASS=$((PASS+1)); echo "OK   $1"; else FAIL=$((FAIL+1)); echo "FAIL $1 -> $3"; fi
}

curl -s --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors "$B/api/public/summary" >/dev/null || { echo "Không kết nối được $B"; exit 1; }

check "1 public summary"          '"warehouses"'            "$(req GET /api/public/summary)"
check "2 me chưa đăng nhập"       '"user":null'             "$(req GET /api/auth/me)"
check "3 login sai"               'Sai số điện thoại'       "$(req POST /api/auth/login '' '{"phone":"0902222222","password":"x"}')"
check "3b tài khoản khóa"         'đã bị khóa'              "$(req POST /api/auth/login '' '{"phone":"0904444444","password":"123456"}')"
check "4 login manager"           '"role":"manager"'        "$(req POST /api/auth/login "$J1" '{"phone":"0902 222 222","password":"123456"}')"
check "5 state manager"           '"suppliers"'             "$(req GET /api/state "$J1")"
check "6 lập phiếu xuất"          '"code":"PX-'             "$(req POST /api/receipts "$J1" '{"type":"out","partnerId":"KH-01","warehouseId":"HN","note":"auto-test","lines":[{"productId":"P01","qty":5},{"productId":"P03","qty":1}]}')"
PX=$(req GET /api/state "$J1" | grep -o '"id":"PX-[0-9]*"' | head -1 | cut -d'"' -f4)
check "7 xuất quá tồn"            'Không đủ tồn'            "$(req POST /api/receipts "$J1" '{"type":"out","partnerId":"KH-01","warehouseId":"HN","lines":[{"productId":"P04","qty":999}]}')"
check "8 tự duyệt (400)"          'tự duyệt'                "$(req POST /api/receipts/$PX/approve "$J1")"
check "9 login admin"             '"role":"admin"'          "$(req POST /api/auth/login "$J2" '{"phone":"0901111111","password":"123456"}')"
check "10 admin duyệt $PX"        '"code":"'"$PX"'"'        "$(req POST /api/receipts/$PX/approve "$J2")"
check "11 duyệt lại (400)"        'đã được xử lý'           "$(req POST /api/receipts/$PX/approve "$J2")"
check "13 kiểm kê HN"             '"code":"KK-'             "$(req POST /api/stocktakes "$J2" '{"warehouseId":"HN","rows":[{"productId":"P01","actual":100},{"productId":"P02","actual":80}]}')"
check "16 tạo kho sai mã"         'Mã kho phải có dạng'     "$(req POST /api/warehouses "$J2" '{"code":"abc","name":"K","address":"a","opened":"2026-01-01"}')"
check "17 tạo kho trùng tên"      'đã được dùng'            "$(req POST /api/warehouses "$J2" '{"code":"KHO-ZZ","name":"kho hà nội","address":"a","opened":"2026-01-01"}')"
check "18 tạo kho OK"             '"id":"ZZ"'               "$(req POST /api/warehouses "$J2" '{"code":"KHO-ZZ","name":"[TEST] Kho ZZ","address":"x","opened":"2026-01-01","capacity":100,"status":"active"}')"
check "19a tạm ngưng ZZ"          '"status":"paused"'       "$(req PUT /api/warehouses/ZZ/status "$J2" '{"status":"paused"}')"
check "19b xóa ZZ"                '"name"'                  "$(req DELETE /api/warehouses/ZZ "$J2")"
check "20 tạo tài khoản"          '"id":"U'                 "$(req POST /api/users "$J2" '{"name":"[TEST] Smoke","phone":"0911222333","password":"abc123","role":"staff","opened":"2026-11-06","status":"locked"}')"
UID_NEW=$(req GET /api/state "$J2" | grep -o '"id":"U[0-9]*","name":"\[TEST\] Smoke"' | cut -d'"' -f4)
check "20b xóa tài khoản"         '"name"'                  "$(req DELETE /api/users/$UID_NEW "$J2")"
check "21 login staff"            '"role":"staff"'          "$(req POST /api/auth/login "$J3" '{"phone":"0903333333","password":"123456"}')"
check "21b staff: NCC ẩn SĐT"     '"phone":"","email":""'   "$(req GET /api/state "$J3" | grep -o '"suppliers":\[{[^}]*}')"
check "22 staff duyệt (403)"      'không có quyền'          "$(req POST /api/receipts/PN-0002/approve "$J3")"
FID=$(req GET /api/state "$J2" | grep -o '"files":\[{"id":"[^"]*"' | sed 's/.*"id":"//;s/"$//')
check "23 admin xem PDF"          '%PDF'                    "$(curl -s -b "$J2" "$B/api/files/$FID" | head -c 8)"
check "23b staff xem PDF (403)"   'không có quyền'          "$(req GET /api/files/$FID "$J3")"
check "24 đường dẫn sai (404)"    '"error"'                 "$(req GET /api/nothing "$J2")"
check "26 logout + me"            '"user":null'             "$(req POST /api/auth/logout "$J2" >/dev/null; req GET /api/auth/me "$J2")"

rm -rf "$T"
echo "----- $PASS đạt, $FAIL thất bại"
[ "$FAIL" -eq 0 ]
