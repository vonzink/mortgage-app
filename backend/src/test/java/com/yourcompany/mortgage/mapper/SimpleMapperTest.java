package com.yourcompany.mortgage.mapper;

import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.model.LoanApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

/**
 * Simple unit tests for LoanApplicationMapper
 */
@ExtendWith(MockitoExtension.class)
class SimpleMapperTest {

    private LoanApplicationMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = Mappers.getMapper(LoanApplicationMapper.class);
    }

    @Test
    void toDTO_WithValidEntity_ShouldReturnCorrectDTO() {
        // Given
        LoanApplication entity = new LoanApplication();
        entity.setId(1L);
        entity.setLoanPurpose("Purchase");
        entity.setLoanType("Conventional");
        entity.setLoanAmount(new BigDecimal("500000"));
        entity.setPropertyValue(new BigDecimal("600000"));
        entity.setStatus("DRAFT");

        // When
        LoanApplicationDTO dto = mapper.toDTO(entity);

        // Then
        assertThat(dto).isNotNull();
        assertThat(dto.getLoanPurpose()).isEqualTo("Purchase");
        assertThat(dto.getLoanType()).isEqualTo("Conventional");
        assertThat(dto.getLoanAmount()).isEqualTo(new BigDecimal("500000"));
        assertThat(dto.getPropertyValue()).isEqualTo(new BigDecimal("600000"));
        assertThat(dto.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void toEntity_WithValidDTO_ShouldReturnCorrectEntity() {
        // Given
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose("Purchase");
        dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("500000"));
        dto.setPropertyValue(new BigDecimal("600000"));
        dto.setStatus("DRAFT");

        // When
        LoanApplication entity = mapper.toEntity(dto);

        // Then
        assertThat(entity).isNotNull();
        assertThat(entity.getLoanPurpose()).isEqualTo("Purchase");
        assertThat(entity.getLoanType()).isEqualTo("Conventional");
        assertThat(entity.getLoanAmount()).isEqualTo(new BigDecimal("500000"));
        assertThat(entity.getPropertyValue()).isEqualTo(new BigDecimal("600000"));
        assertThat(entity.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void mapper_ShouldBeNotNull() {
        // Then
        assertThat(mapper).isNotNull();
    }
}
