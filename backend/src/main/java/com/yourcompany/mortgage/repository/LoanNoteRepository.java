package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.LoanNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanNoteRepository extends JpaRepository<LoanNote, Long> {

    List<LoanNote> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
