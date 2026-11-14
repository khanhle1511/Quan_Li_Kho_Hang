package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.Rules;
import com.qlkho.model.CodeSeq;
import com.qlkho.repo.CodeSeqRepo;
import jakarta.persistence.EntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Collection;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * Tạo bản ghi mới có mã sinh theo "mã lớn nhất + 1" (U, P, PN-, PX-, KK-) một cách an toàn
 * khi nhiều request đến cùng lúc (BUG-005, BUG-007).
 *
 * <ul>
 *   <li>Một khóa chung được giữ suốt transaction (kể cả lúc commit) nên các request tạo mới chạy tuần tự
 *       trong một máy chủ: bước "đọc mã lớn nhất → ghi" và các kiểm tra trùng (SĐT, SKU, mã kho…) không bị xen kẽ.</li>
 *   <li>Bản ghi mới phải ghi bằng {@link #insert} (persist → luôn INSERT). {@code repository.save()} với mã gán tay
 *       sẽ merge và ghi đè bản ghi đã có cùng mã mà vẫn trả 200.</li>
 *   <li>Nếu vẫn trùng khóa (ví dụ nhiều máy chủ dùng chung CSDL) thì thử lại với mã mới; hết lượt thì trả 409 thay vì 500.</li>
 * </ul>
 */
@Component
public class CreateTx {
    private static final int MAX_ATTEMPTS = 3;

    private final TransactionTemplate tx;
    private final EntityManager em;
    private final CodeSeqRepo seqs;
    private final ReentrantLock lock = new ReentrantLock();

    public CreateTx(PlatformTransactionManager txManager, EntityManager em, CodeSeqRepo seqs) {
        this.tx = new TransactionTemplate(txManager);
        this.em = em;
        this.seqs = seqs;
    }

    /**
     * BUG-011: số thứ tự kế tiếp cho loại mã {@code kind}, lấy từ bảng đếm chỉ tăng (ma_tiep_theo) thay vì
     * "mã lớn nhất đang tồn tại + 1", nên mã của bản ghi đã xóa không bao giờ được cấp lại.
     * Lần đầu (CSDL cũ chưa có dòng đếm) khởi tạo từ mã lớn nhất đang có; về sau luôn lấy max của hai nguồn
     * để không bao giờ cấp trùng với bản ghi đang tồn tại. Chỉ gọi bên trong {@link #run}.
     */
    public int nextNumber(String kind, Collection<String> existingIds, String prefix) {
        int fromData = Rules.maxNumber(existingIds, prefix) + 1;
        CodeSeq seq = seqs.lockByKind(kind).orElse(null);
        if (seq == null) {
            seq = new CodeSeq();
            seq.kind = kind;
            seq.next = fromData;
            em.persist(seq);
        }
        int n = Math.max(seq.next, fromData);
        seq.next = n + 1;
        return n;
    }

    /** Chạy {@code body} trong một transaction riêng, dưới khóa chung; thử lại khi CSDL báo trùng khóa. */
    public <T> T run(Supplier<T> body) {
        lock.lock();
        try {
            for (int attempt = 1; ; attempt++) {
                try {
                    return tx.execute(status -> body.get());
                } catch (DataIntegrityViolationException e) {
                    if (attempt >= MAX_ATTEMPTS) throw new ApiException(409, "Hệ thống đang bận, vui lòng thử lại.");
                }
            }
        } finally {
            lock.unlock();
        }
    }

    /** INSERT bản ghi mới (chỉ gọi bên trong {@link #run}). */
    public void insert(Object entity) {
        em.persist(entity);
    }
}
