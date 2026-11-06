/**
 * SỐ WORKER (số tiến trình chạy test song song) cho Playwright.
 *
 * Sửa giá trị WORKERS bên dưới, lưu file, rồi chạy như bình thường:
 *   npm run bdd:allure        (kịch bản BDD)
 *   npm run test:allure       (test viết tay trong tests/)
 *
 * Giá trị hợp lệ:
 *   1, 2, 4, 6…  số worker cố định (1 = chạy tuần tự từng test)
 *   '50%'        theo phần trăm số nhân CPU của máy
 *
 * Thứ tự ưu tiên (cái đứng trước thắng):
 *   1. --workers=N trên dòng lệnh      npm run bdd:allure -- --workers=6
 *   2. biến môi trường WORKERS         WORKERS=6 npm run bdd:allure
 *   3. giá trị trong file này
 *
 * Lưu ý:
 *   - Chạy trên bản online (Render) luôn dùng 1 worker, bất kể giá trị ở đây.
 *   - Các script bdd, bdd:smoke, bdd:regression, bdd:exclusive, bdd:after-reset ghi cứng --workers=1
 *     vì chúng kiểm tra số liệu dùng chung; không chạy song song các nhóm @exclusive, @after-reset, @seed-data.
 *   - Khi WORKERS khác 1, project bdd chia việc theo từng kịch bản (không theo file) để dùng hết số worker.
 */
export const WORKERS: number | `${number}%` = 4;
