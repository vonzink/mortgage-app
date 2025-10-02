package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.Residence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResidenceRepository extends JpaRepository<Residence, Long> {

    @Query("SELECT r FROM Residence r WHERE r.borrower.id = :borrowerId")
    List<Residence> findByBorrowerId(@Param("borrowerId") Long borrowerId);

    @Query("SELECT r FROM Residence r WHERE r.borrower.id = :borrowerId AND r.residencyType = :residencyType")
    List<Residence> findByBorrowerIdAndResidencyType(@Param("borrowerId") Long borrowerId,
                                                     @Param("residencyType") String residencyType);
}
