# Nhiều instance local cho nhiều agent

Mỗi agent (Claude Code, Copilot…, hoặc người) làm việc với **một instance riêng** của qlkho-web. Mỗi instance có:

- cổng riêng;
- CSDL H2 riêng, bắt đầu từ dữ liệu mẫu;
- log riêng.

Nhờ vậy, dữ liệu test của agent này không làm hỏng kết quả của agent khác. Các lỗi đã gặp khi dùng chung một CSDL: mã `P99` bị trùng, vượt mốc 100 nhà cung cấp, test `@seed-data` sai số liệu.

| Agent | Cổng | URL | CSDL | Log |
| --- | --- | --- | --- | --- |
| agent1 | 8101 | http://localhost:8101 | `agents/data/agent1/` | `agents/logs/agent1.log` |
| agent2 | 8102 | http://localhost:8102 | `agents/data/agent2/` | `agents/logs/agent2.log` |
| agent3 | 8103 | http://localhost:8103 | `agents/data/agent3/` | `agents/logs/agent3.log` |
| agent4 | 8104 | http://localhost:8104 | `agents/data/agent4/` | `agents/logs/agent4.log` |

Đổi cổng bắt đầu hoặc số instance trong [`agents.config.json`](agents.config.json): `basePort`, `count`. agentK **ưu tiên** cổng `basePort + K − 1` (nếu bị chiếm thì tự đổi, xem mục dưới), nên có thể chạy thêm `agent5`, `agent6`… mà không cần sửa config.

## Tự đổi cổng khi cổng bị chiếm

Khi bật một agent, script chọn cổng theo thứ tự: **cổng ưu tiên** của agent đó, rồi đến **dải dự phòng** `fallbackPorts` (mặc định 8201–8299). Mỗi cổng được kiểm tra rồi xử lý theo tình trạng:

| Tình trạng cổng | Xử lý |
| --- | --- |
| Trống | Dùng cổng này. Nếu không phải cổng ưu tiên thì in `cổng 8102 không dùng được → chuyển sang cổng 8202` |
| Đang được một agent khác dùng | Bỏ qua, xét cổng kế tiếp |
| Bị tiến trình khác chiếm (app cũ, chương trình khác) | Bỏ qua, xét cổng kế tiếp |
| Trống lúc kiểm tra nhưng bị giành trước khi Spring Boot mở (log báo `Port … was already in use`) | Tự khởi động lại trên cổng kế tiếp, tối đa `maxPortTries` lần (mặc định 5) |

Cổng thực tế được lưu ở `agents/run/agentN.json`. Các lệnh `status`, `url`, `port` và e2e (`AGENT=agentN`) đều đọc từ file này, nên **không cần biết trước cổng**. Cột `port` trong `status` ghi `8202 (thay 8102)` khi đã đổi. Khi cần cổng hiện tại, nên hỏi script thay vì đoán:

```bash
node agents/agents.mjs url agent2     # http://localhost:8202
node agents/agents.mjs port agent2    # 8202
```

Lần `restart` sau, agent lại thử cổng ưu tiên trước.

## Lệnh (chạy ở thư mục gốc `qlkho-web`)

```bash
node agents/agents.mjs start              # bật agent1..agent4 (đợi đến khi sẵn sàng)
node agents/agents.mjs start 2            # chỉ bật agent1, agent2
node agents/agents.mjs start agent5       # bật thêm một agent (ưu tiên cổng 8105)
node agents/agents.mjs status             # bảng cổng / PID / tình trạng / dung lượng CSDL
node agents/agents.mjs reset agent2       # xóa CSDL của agent2 → về dữ liệu mẫu, bật lại
node agents/agents.mjs restart            # khởi động lại tất cả (sau khi sửa code Java và build lại)
node agents/agents.mjs logs agent3        # 40 dòng log cuối
node agents/agents.mjs url agent2         # địa chỉ đang dùng (sau khi có thể đã đổi cổng)
node agents/agents.mjs stop               # tắt tất cả  (stop agent2: tắt một)
```

## Chạy test e2e cho đúng agent

Đặt `AGENT=agentN`. Playwright sẽ tự trỏ tới cổng của agent đó, và ghi kết quả vào `e2e/output/agentN/`: test-results, report, allure-results, allure-report. Nhờ vậy các agent chạy cùng lúc không đè kết quả của nhau.

```bash
cd e2e
# Git Bash
AGENT=agent2 npm run bdd:allure -- .features-gen/features/04-nhap-xuat-kho
AGENT=agent2 npm run allure:generate
AGENT=agent2 npm run allure:open
# PowerShell
$env:AGENT="agent2"; npm run bdd:allure
```

Thứ tự ưu tiên khi chọn địa chỉ app: `BASE_URL` > `AGENT` > `http://localhost:8080`.

## Gợi ý giao việc cho agent

Ghi vào prompt của từng agent, ví dụ:

> Bạn là **agent2**. Lấy địa chỉ app bằng `node agents/agents.mjs url agent2` (thường là http://localhost:8102, có thể khác nếu cổng bị chiếm; CSDL riêng). Chạy test bằng `AGENT=agent2`. Cần dữ liệu sạch thì chạy `node agents/agents.mjs reset agent2`. Không đụng cổng hay CSDL của agent khác.

## Lưu ý

- **Code dùng chung.** Mọi instance chạy cùng bản build trong `target/`: ưu tiên `target/qlkho-web-*.jar`, nếu không có thì dùng `target/classes` + `target/cp.txt`. Sau khi một agent sửa code Java và build lại, chạy `restart` thì các instance mới nhận code mới. Nếu agent cần thử code riêng mà không ảnh hưởng agent khác, hãy dùng git worktree riêng.
- **Java:** cần Java 25. Script tìm theo thứ tự:
  1. `javaHome` trong config;
  2. biến `JAVA_HOME`;
  3. JDK đi kèm extension Java của VS Code;
  4. `java` trên PATH.
- **Bộ nhớ:** mỗi instance dùng tối đa 512 MB (`javaOpts`); 4 instance khoảng 1–2 GB RAM.
- Các cổng 8080, 8097–8099 không dùng vì thường bị instance cũ chiếm.
- `agents/data`, `agents/logs`, `agents/run` không được commit (đã có trong `.gitignore`).
