package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByCognitoSub(String cognitoSub);
    Optional<User> findByEmail(String email);
}
