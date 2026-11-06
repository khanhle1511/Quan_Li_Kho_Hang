-- =====================================================================
--  Hệ thống quản lý kho – Lược đồ CSDL (MySQL 8)
--  Ứng dụng tự tạo bảng qua JPA (ddl-auto=update). File này dùng để:
--   (1) đưa vào báo cáo phần Thiết kế CSDL, (2) tạo bảng thủ công nếu muốn.
-- =====================================================================
CREATE DATABASE IF NOT EXISTS qlkho CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qlkho;

-- Tài khoản: đăng nhập bằng số điện thoại, mật khẩu băm BCrypt
CREATE TABLE nguoi_dung (
  id             VARCHAR(20)  PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  phone          VARCHAR(15)  NOT NULL UNIQUE,
  password_hash  VARCHAR(100) NOT NULL,
  role           VARCHAR(10)  NOT NULL CHECK (role IN ('admin','manager','staff')),
  opened         VARCHAR(10),
  status         VARCHAR(10)  NOT NULL CHECK (status IN ('active','draft','locked'))
);

CREATE TABLE kho (
  id         VARCHAR(20)  PRIMARY KEY,
  code       VARCHAR(20)  NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  address    VARCHAR(200),
  keeper_id  VARCHAR(20),                       -- thủ kho phụ trách
  phone      VARCHAR(15),
  capacity   INT NOT NULL DEFAULT 0 CHECK (capacity >= 0),  -- 0 = không giới hạn
  opened     VARCHAR(10),
  status     VARCHAR(10)  NOT NULL CHECK (status IN ('active','paused')),
  CONSTRAINT fk_kho_thukho FOREIGN KEY (keeper_id) REFERENCES nguoi_dung(id) ON DELETE SET NULL
);

CREATE TABLE hang_hoa (
  id         VARCHAR(20)  PRIMARY KEY,
  sku        VARCHAR(30)  NOT NULL UNIQUE,
  name       VARCHAR(150) NOT NULL,
  category   VARCHAR(80),
  unit       VARCHAR(20)  NOT NULL,
  min_stock  INT    NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  price      BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0)
);

-- Tồn kho theo cặp (hàng hóa, kho); khóa = 'P01|HN'
CREATE TABLE ton_kho (
  id            VARCHAR(45) PRIMARY KEY,
  product_id    VARCHAR(20) NOT NULL,
  warehouse_id  VARCHAR(20) NOT NULL,
  qty           INT NOT NULL CHECK (qty >= 0),
  UNIQUE (product_id, warehouse_id),
  CONSTRAINT fk_ton_hh  FOREIGN KEY (product_id)   REFERENCES hang_hoa(id),
  CONSTRAINT fk_ton_kho FOREIGN KEY (warehouse_id) REFERENCES kho(id)
);

-- Nhà cung cấp (sup) và khách hàng (cus)
CREATE TABLE doi_tac (
  id            VARCHAR(20)  PRIMARY KEY,
  partner_type  VARCHAR(5)   NOT NULL CHECK (partner_type IN ('sup','cus')),
  name          VARCHAR(150) NOT NULL,
  phone         VARCHAR(15),
  email         VARCHAR(120),
  address       VARCHAR(200),
  note          VARCHAR(2000),
  note_at       VARCHAR(20),
  note_by       VARCHAR(100)
);

CREATE TABLE ho_so_doi_tac (
  id           VARCHAR(40)  PRIMARY KEY,
  partner_id   VARCHAR(20)  NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_size    BIGINT NOT NULL,
  uploaded_at  VARCHAR(20),
  uploaded_by  VARCHAR(100),
  stored_path  VARCHAR(300) NOT NULL,           -- 'db' = nội dung nằm trong bảng ho_so_noi_dung
  CONSTRAINT fk_hoso_doitac FOREIGN KEY (partner_id) REFERENCES doi_tac(id)
);

-- Nội dung nhị phân của file PDF (tách riêng để liệt kê hồ sơ không phải tải cả file)
CREATE TABLE ho_so_noi_dung (
  id    VARCHAR(40) PRIMARY KEY,                -- trùng ho_so_doi_tac.id
  data  LONGBLOB NOT NULL,                      -- Hibernate tự chọn kiểu theo CSDL: LONGBLOB (MySQL), BYTEA (PostgreSQL), VARBINARY (H2)
  CONSTRAINT fk_noidung_hoso FOREIGN KEY (id) REFERENCES ho_so_doi_tac(id) ON DELETE CASCADE
);

-- Phiếu nhập (in) / xuất (out). Tồn chỉ thay đổi khi status = 'approved'
CREATE TABLE phieu (
  id             VARCHAR(20)  PRIMARY KEY,      -- PN-0001, PX-0001
  receipt_type   VARCHAR(5)   NOT NULL CHECK (receipt_type IN ('in','out')),
  partner_id     VARCHAR(20)  NOT NULL,
  warehouse_id   VARCHAR(20)  NOT NULL,
  created_at     VARCHAR(20),
  status         VARCHAR(12)  NOT NULL CHECK (status IN ('pending','approved','cancelled')),
  creator_id     VARCHAR(20),
  creator_name   VARCHAR(100),                  -- lưu tên để giữ lịch sử khi tài khoản bị xóa
  approver_name  VARCHAR(100),
  note           VARCHAR(500),
  sort_key       BIGINT NOT NULL,
  CONSTRAINT fk_phieu_doitac FOREIGN KEY (partner_id) REFERENCES doi_tac(id)
);

CREATE TABLE chi_tiet_phieu (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  receipt_id  VARCHAR(20) NOT NULL,
  product_id  VARCHAR(20) NOT NULL,
  qty         INT NOT NULL CHECK (qty > 0),
  CONSTRAINT fk_ct_phieu FOREIGN KEY (receipt_id) REFERENCES phieu(id),
  CONSTRAINT fk_ct_hh    FOREIGN KEY (product_id) REFERENCES hang_hoa(id)
);

-- Thẻ kho: mọi biến động tồn
CREATE TABLE the_kho (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  happened_at   VARCHAR(20),
  product_id    VARCHAR(20) NOT NULL,
  warehouse_id  VARCHAR(20) NOT NULL,
  kind          VARCHAR(20) NOT NULL,           -- Nhập | Xuất | Kiểm kê
  delta         INT NOT NULL,
  qty_after     INT NOT NULL,
  ref           VARCHAR(20)                     -- mã chứng từ
);

CREATE TABLE phieu_kiem_ke (
  id             VARCHAR(20) PRIMARY KEY,       -- KK-0001
  created_at     VARCHAR(20),
  warehouse_id   VARCHAR(20) NOT NULL,
  checked_count  INT NOT NULL,
  diff_count     INT NOT NULL,
  confirmed_by   VARCHAR(100),
  sort_key       BIGINT NOT NULL
);
