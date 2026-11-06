/**
 * Selector của giao diện qlkho-web, lấy từ src/main/resources/static/index.html (ngày 07/11/2026).
 * Giao diện là một file, vẽ lại toàn bộ sau mỗi thao tác: luôn truy vấn lại locator, không giữ ElementHandle.
 * `data-c` / `data-i` là chỉ số handler, thay đổi mỗi lần vẽ → KHÔNG dùng làm selector.
 *
 * Số dòng (index.html) ghi kèm để khi giao diện đổi thì biết chỗ cần xem lại.
 */
export const SEL = {
  // ---- trang chủ & đăng nhập (viewHome 640, viewLogin 680) ----
  home: '#home',                                   // kéo lên > 70px, ArrowUp/ArrowDown/PageDown/Enter/Space → leaveHome (hiệu ứng 640 ms)
  homeGo: '.home-nav [data-home="go"]',
  loginUser: '[data-fid="login-user"]',            // form nằm sẵn trong DOM nhưng inert khi còn trang chủ; điền sẵn tài khoản manager
  loginPass: '[data-fid="login-pass"]',
  loginBtn: '.auth-card button.btn-primary',
  loginErr: '.alert-err',                          // cũng là chỗ hiện "Phiên đăng nhập …" khi máy chủ trả 401
  roleCard: '.rolecard',                           // 3 thẻ demo U1, U2, U3; thẻ khớp SĐT đang nhập có class .on + aria-pressed="true"

  // ---- khung ứng dụng (viewSidebar 730, viewTop 742) ----
  navItem: 'aside button.nav',                     // chữ "Kho" trùng "Nhập kho"/"Xuất kho" → so khớp chính xác /^Kho$/
  navBadge: 'aside button.nav .badge',             // số cảnh báo trên mục "Cảnh báo tồn thấp"
  logout: 'main button:has-text("Đăng xuất")',
  pageTitle: 'main h1',
  toast: '.toast',                                 // tồn tại ~4,2 s

  // ---- dùng chung ----
  pill: 'button.pill',                             // đang chọn: .pill.on
  statBtn: 'button.statbtn',                       // thẻ số liệu bấm được để lọc; đang lọc: .statbtn.on có <span class="tick">Đang lọc</span>
  row: '.trow',                                    // dòng bảng; dòng tô vàng: .trow.hl
  chip: '.chip',
  card: (title: string) => `section.card:has(h2:text-is("${title}"))`,
  overlayDialog: '.overlay .dialog',

  // ---- Tổng quan (viewDashboard 754) ----
  kpi: 'button.kpi2',
  kpiValue: 'span[style*="font-size:28px"]',
  /** Tên ngắn trong kịch bản → nhãn thật trên thẻ KPI */
  kpiLabel: { 'Giá trị tồn': 'Giá trị tồn kho', 'Tổng tồn': 'Tổng số lượng tồn', 'Phiếu chờ': 'Phiếu chờ duyệt', 'Cảnh báo': 'Cảnh báo tồn thấp' } as Record<string, string>,
  /** KPI → màn hình đích (Phiếu chờ sang Xuất kho nếu phiếu xuất chờ nhiều hơn, ngược lại Nhập kho) */
  chartCard: 'section.card:has(h2:text-is("Mức tồn so với ngưỡng tối thiểu"))',
  chartBar: '.brow',                               // mỗi mặt hàng một .brow; tên ở span đầu tiên
  lowCardRow: 'section.card:has(h2:text-is("Cần nhập bổ sung")) .listrow',   // nút "Nhập"; dòng phụ "SKU, tên kho"
  pendCardRow: 'section.card:has(h2:text-is("Phiếu chờ duyệt")) .listrow',   // nút "Duyệt" (manager/admin, không phải phiếu mình lập) hoặc "Mở"

  // ---- Nhập kho / Xuất kho (viewReceipts 878) ----
  optcard: 'button.optcard',                       // thẻ chọn đối tác và kho; dòng phụ: mã đối tác (+ SĐT nếu được xem)
  pick: 'button.pick',                             // hàng hóa ở bước 2
  rcSearch: (t: 'in' | 'out') => `[data-fid="rc-search-${t}"]`,
  rcQty: (t: 'in' | 'out', i: number) => `[data-fid="rc-qty-${t}-${i}"]`,
  rcNote: (t: 'in' | 'out') => `[data-fid="rc-note-${t}"]`,
  slipLine: '.slip .slipline',
  slipWarn: '.slipline .warn',                     // "Vượt tồn N <đvt>" (đỏ) / "Sau xuất sẽ dưới mức tối thiểu (min)" (cam)
  slipCode: '.sliphead span[style*="font-size:20px"]',   // mã dự kiến, ví dụ PN-0003
  // Staff: "Lưu phiếu và gửi duyệt"; Manager/Admin ở phiếu nhập: "Lưu phiếu và nhập kho" (duyệt ngay – BR-09 sửa 07/11/2026)
  rcSave: 'button:has-text("Lưu phiếu và gửi duyệt"), button:has-text("Lưu phiếu và nhập kho")',
  rcErr: 'section.card .alert-err',
  rcList: '#rc-list',
  rcRow: '#rc-list .trow',                         // cột cuối: nút Duyệt/Từ chối hoặc "Phiếu do bạn lập, cần người khác duyệt"

  // ---- Kiểm kê (viewStocktake 972) ----
  kkWhCard: 'button.optcard',
  kkStart: 'button:has-text("Bắt đầu kiểm kê")',
  kkBar: '.sessionbar',                            // "ĐANG KIỂM KÊ"; ô .mini: Mặt hàng / Khớp / Thừa / Thiếu
  kkRow: 'section.card:has(h2:text-is("Bảng đối chiếu")) .trow',
  kkMinus: 'button[aria-label="Giảm"]',
  kkPlus: 'button[aria-label="Tăng"]',
  kkInput: (i: number) => `[data-fid="kk-${i}"]`,
  kkConfirm: 'button:has-text("Xác nhận và điều chỉnh tồn")',
  kkStaffNotice: '.notice:has-text("Quản lý kho cần đăng nhập để xác nhận")',
  kkHistoryRow: 'section.card:has(h2:text-is("Lịch sử kiểm kê")) .trow',

  // ---- Tồn kho (viewInventory 1026) ----
  invQ: '[data-fid="inv-q"]',
  invLowCheck: 'label:has-text("Chỉ hiện tồn thấp") input[type=checkbox]',
  invRow: 'section.card:has(h2:text-is("Tồn kho theo mặt hàng và kho")) .trow',   // span: SKU, tên, kho, mức, "tồn / min", chip, nút "Thẻ kho"
  invCard: 'section.card:has(h2:text-matches("^Thẻ kho:"))',
  invCardTimeline: 'section.card:has(h2:text-matches("^Thẻ kho:")) .tl',
  invBanner: '.notice:has-text("Đang xem tồn kho của")',
  invBack: 'button:has-text("Quay lại danh sách kho")',

  // ---- Cảnh báo (viewAlerts 1144) ----
  alertRow: 'section.card:has(h2:text-is("Mặt hàng dưới mức tối thiểu")) .trow',   // span: SKU, tên, kho, tồn, min, thiếu, "đề xuất đvt", nút

  // ---- Báo cáo (viewReports 1079) ----
  repTotalRow: '.trow:has(span:text-is("Tổng cộng"))',   // span: '', Tổng cộng, tồn đầu, +nhập, −xuất, điều chỉnh, tồn cuối, giá trị
  repPeriod: '.pill.on:has-text("Tháng")',
  repWaterfallValue: '.chartwrap svg text[font-weight="700"]',     // 5 nhãn: tồn đầu, nhập, xuất, điều chỉnh, tồn cuối

  // ---- Hàng hóa (viewProducts 1153) ----
  prQ: '[data-fid="pr-q"]',
  prRow: 'section.card:has(h2:text-is("Danh mục hàng hóa")) .trow',
  prAdd: 'button:has-text("+ Thêm hàng hóa")',
  prForm: { sku: '[data-fid="pf-sku"]', name: '[data-fid="pf-name"]', cat: '[data-fid="pf-cat"]', unit: '[data-fid="pf-unit"]', min: '[data-fid="pf-min"]', price: '[data-fid="pf-price"]', save: 'button:has-text("Lưu hàng hóa")' },

  // ---- Nhà cung cấp / Khách hàng (viewPartners 1235, viewPartnerDetail 1181, hpHtml 1618) ----
  pList: '#p-list',
  pRow: '#p-list .trow',
  hp: (id: string) => `[data-hp="${id}"]`,         // rê chuột 180 ms mới hiện popup
  hpop: '#hpop.show',                              // popup; khi ẩn liên hệ: "Thông tin liên hệ được ẩn theo phân quyền"; chân: "N hồ sơ PDF."
  pDetail: '#p-detail',
  pDetailRow: '#p-detail .trow',
  pDetailTab: '#p-detail button.pill',             // nhãn "Còn trong kho (n)", "Đã nhập thành công (n)", "Đang chờ duyệt (n)", "Lịch sử phiếu (n)"
  pDetailBtn: (id: string) => `#p-list .trow:has([data-hp="${id}"]) button:has-text("Chi tiết")`,
  pEdit: '#p-detail button:has-text("Sửa thông tin")',
  pNoteEdit: '[data-fid="p-note"]',                // chỉ có với manager/admin; staff thấy <p> chỉ đọc
  pAddSup: 'button:has-text("+ Thêm nhà cung cấp")',
  pAddCus: 'button:has-text("+ Thêm khách hàng")',
  pForm: { name: '[data-fid="pf2-name"]', phone: '[data-fid="pf2-phone"]', email: '[data-fid="pf2-email"]', address: '[data-fid="pf2-address"]', save: 'section.card button.btn-primary:text-is("Lưu")' },

  // ---- Kho (viewWarehouses 1391, viewKeeperPicker 1332, viewWhDeleteDialog 1379) ----
  whRow: 'section.card:has(h2:text-is("Danh sách kho")) .trow',     // span: kho(.whlink), địa chỉ+ĐT, thủ kho, sức chứa, hàng hóa, trạng thái, thao tác
  whLink: 'button.whlink',
  whAdd: 'button:has-text("+ Thêm kho")',
  whForm: { code: '[data-fid="wf-code"]', name: '[data-fid="wf-name"]', address: '[data-fid="wf-address"]', phone: '[data-fid="wf-phone"]', cap: '[data-fid="wf-cap"]', opened: '[data-fid="wf-opened"]' },
  keeperBox: '.keeperbox',
  kpQ: '[data-fid="kp-q"]',
  kpRow: '.kpick-row',                             // "Đang phụ trách: …" trong .kstatus
  whDelBtn: (name: string) => `button[aria-label^="Xóa ${name}"]`,
  whDelAck: '[data-fid="wdel-ack"]',
  whDelConfirm: '.dialog-foot button:has-text("Xóa kho")',

  // ---- Người dùng (viewUsers 1520, viewDeleteDialog 1504) ----
  userRow: '#user-table .trow',
  // ---- RCPT-10: sổ phiếu nhập/xuất + popup chi tiết (viewReceiptBook, viewReceiptDialog) ----
  rbRow: '#rb-list .trow',                         // cột: mã (rc-link), loại, ngày/người lập, đối tác, kho, hàng hóa ("•••" nếu che), tổng SL, trạng thái, Xem
  rbQ: '[data-fid="rb-q"]',
  rbSub: '#rb-list .cardhead .muted',              // "Hiển thị 1–10 / 305 phiếu. …" (phân trang 10 phiếu/trang)
  pager: '#rb-list .pager',                        // "Trang x / y"; nút data-page="prev" | "next" | số trang
  rbDecided: '.decided',                           // ô "Thời gian duyệt": thời điểm | "Từ chối lúc …" | "Đợi duyệt"
  statTile: 'main .stat',                          // thẻ số liệu (bấm để lọc khi là nút)
  rcLink: 'button.rc-link',                        // mã phiếu bấm được (data-code) ở sổ phiếu, Nhập/Xuất kho, chi tiết đối tác
  rcvDialog: '.dialog.rcv',                        // popup chi tiết phiếu; .rcv-info (đối tác/kho/người lập/người duyệt), .rcv-lines, .rcv-move
  rcvTitle: '#rcv-title',
  rcvMove: '.rcv-move',
  overlay: '.overlay',
  actRc: 'button.act-rc',                          // dòng phiếu bấm được trong lịch sử hoạt động (data-code)
  // ---- USR-07: lịch sử hoạt động (viewActivity) ----
  userNameBtn: 'button.ulink',                     // tên trong bảng Người dùng, bấm để mở lịch sử (aria-label "Xem lịch sử hoạt động của …")
  actOverlay: '.overlay-right',                    // nền tối; bấm vào nền (ngoài .drawer) thì đóng
  actDrawer: '.drawer',                            // bảng trượt bên phải; .cardhead: #act-title (tên), chip vai trò + tình trạng, SĐT; nút aria-label="Đóng"
  actList: '#act-list',                            // chỉ xuất hiện khi API /activity đã trả về
  actQ: '[data-fid="act-q"]',                      // ô tìm kiếm trong bảng
  actPill: '.drawer .pill',                        // "Tất cả (n)", "Nhập/Xuất kho (n)", …
  actDay: '.drawer .act-day',                      // tiêu đề nhóm ngày "Hôm nay · dd/MM/yyyy"
  actItem: '.drawer .act-item',                    // data-cat, data-action, data-at; chip "Do X thực hiện" / "Suy ra từ chứng từ"
  userDelBtn: (name: string) => `button[aria-label^="Xóa tài khoản ${name}"]`,
  userDelAck: '[data-fid="del-ack"]',
  userDelConfirm: '.dialog-foot button:has-text("Xóa tài khoản")',
} as const;

/** Toast và thông báo giao diện (để so khớp) */
export const TEXT = {
  receiptCreated: /^Đã tạo phiếu (P[NX]-\d{4}) – đang chờ Quản lý kho duyệt\.$/,
  approved: /^Đã duyệt (P[NX]-\d{4})\./,
  sessionHidden: 'được ẩn theo phân quyền',
  exportSimulated: '(mô phỏng',
} as const;
