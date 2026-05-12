package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.LoanNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanNoteRepository extends JpaRepository<LoanNote, Long> {

    List<LoanNote> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
