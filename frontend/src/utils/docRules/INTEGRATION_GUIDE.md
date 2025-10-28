# Document Rules Engine - Integration Guide

This guide shows you how to integrate the new document rules engine into your mortgage application.

## Quick Start

### Option 1: Use the React Hook (Recommended)

```typescript
import { useDocumentChecklist } from '../hooks/useDocumentChecklist';

function MyComponent() {
  const formData = useForm(); // Your form data
  
  const { result, explanations, isValid } = useDocumentChecklist(formData);
  
  return (
    <div>
      <h3>Required Documents: {result.required.length}</h3>
      {result.required.map(doc => (
        <div key={doc.id}>{doc.label}</div>
      ))}
    </div>
  );
}
```

### Option 2: Use the Bridge (Backward Compatible)

```javascript
import { generateDocumentRecommendations } from '../utils/documentRecommendationsBridge';

function MyComponent() {
  const recommendations = generateDocumentRecommendations(formData);
  
  return (
    <div>
      {recommendations.general.map(doc => (
        <div key={doc.name}>{doc.name}</div>
      ))}
    </div>
  );
}
```

### Option 3: Use the Component

```typescript
import DocumentChecklist from '../components/DocumentChecklist';

function MyComponent() {
  return (
    <DocumentChecklist 
      application={formData}
      showExplanations={true}
      onDocumentClick={(doc) => console.log('Clicked:', doc)}
    />
  );
}
```

## Integration Steps

### Step 1: Update Your Form Structure

Ensure your form includes these fields:

```typescript
interface FormData {
  program: 'Conventional' | 'FHA' | 'VA' | 'USDA';
  transactionType: 'Purchase' | 'RateTermRefi' | 'CashOutRefi';
  occupancy: 'Primary' | 'SecondHome' | 'Investment';
  propertyType: 'SFR' | 'Condo' | 'PUD' | '2-4 Unit' | 'Manufactured';
  
  borrowers: [{
    firstName: string;
    lastName: string;
    maritalStatus: string;
    citizenshipType: string;
    employmentHistory: [{
      employerName: string;
      startDate: string;
      monthlyIncome: number;
      selfEmployed: boolean;
      businessType?: string;
      businessStartDate?: string;
      ownershipPercent?: number;
    }];
    incomes: [{
      incomeType: string;
      monthlyAmount: number;
    }];
    assets: [{
      assetType: string;
      assetValue: number;
    }];
    declaration: {
      paysAlimony: boolean;
      paysChildSupport: boolean;
      receivesChildOrAlimony: boolean;
      declaredBankruptcySevenYears: boolean;
      propertyForeclosedSevenYears: boolean;
      // ... other declarations
    };
  }];
}
```

### Step 2: Add Document Checklist to Your UI

#### In ApplicationForm.js:

```typescript
import { useDocumentChecklist } from '../hooks/useDocumentChecklist';

function ApplicationForm() {
  const { register, watch, getValues } = useForm();
  const formData = watch();
  
  const { result, explanations } = useDocumentChecklist(formData);
  
  return (
    <div>
      {/* Your existing form fields */}
      
      {/* Document Checklist Section */}
      <div className="document-checklist-section">
        <h3>Required Documents</h3>
        <p>Based on your application, you'll need to provide:</p>
        
        <div className="doc-list">
          {result.required.map(doc => (
            <div key={doc.id} className="doc-item">
              <input type="checkbox" />
              <span>{doc.label}</span>
              <small>{doc.reason}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Add Document Upload Tracking

```typescript
import { useDocumentTracking } from '../hooks/useDocumentChecklist';

function DocumentUploadPage() {
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const { tracking, percentComplete, isComplete } = useDocumentTracking(
    formData, 
    uploadedDocs
  );
  
  return (
    <div>
      <div className="progress-bar">
        <div style={{ width: `${percentComplete}%` }}></div>
      </div>
      
      <div className="doc-list">
        {tracking.map(doc => (
          <div key={doc.id} className={doc.uploaded ? 'complete' : 'pending'}>
            <input 
              type="checkbox" 
              checked={doc.uploaded}
              onChange={() => handleUpload(doc.id)}
            />
            <span>{doc.label}</span>
            <span className="status">{doc.status}</span>
          </div>
        ))}
      </div>
      
      {isComplete && (
        <button onClick={handleSubmit}>Submit Application</button>
      )}
    </div>
  );
}
```

### Step 4: Add Document Recommendations to Review Page

```typescript
import { useDocumentRecommendations } from '../hooks/useDocumentChecklist';

function ReviewSubmitStep() {
  const { recommendations, explanations } = useDocumentRecommendations(formData);
  
  return (
    <div>
      <h3>Document Checklist</h3>
      
      {recommendations.map(rec => (
        <div key={rec.category} className="rec-category">
          <h4>
            {rec.category} 
            <span className={`priority ${rec.priority}`}>
              {rec.priority.toUpperCase()}
            </span>
          </h4>
          
          <ul>
            {rec.documents.map(doc => (
              <li key={doc.id}>
                {doc.label}
                <small>{doc.reason}</small>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## Migration Path

### Phase 1: Parallel Implementation (Current)

1. Keep existing `documentRecommendations.js`
2. Add new rules engine alongside
3. Use bridge for backward compatibility
4. Test with real data

### Phase 2: Gradual Migration

1. Update one page at a time to use new engine
2. Keep bridge for pages not yet migrated
3. Compare outputs to ensure consistency

### Phase 3: Full Migration

1. Remove old `documentRecommendations.js`
2. Remove bridge
3. Use new engine exclusively

## Testing

### Unit Tests

Run the test suite:

```bash
cd frontend
npm test -- docRules.spec.ts
```

### Integration Tests

Test with real form data:

```typescript
import { generateDocChecklist } from './utils/docRules';

const testData = {
  program: 'Conventional',
  transactionType: 'Purchase',
  // ... your form data
};

const result = generateDocChecklist(testData);
console.log('Required:', result.required.length);
console.log('Optional:', result.niceToHave.length);
```

## Customization

### Add Custom Rules

```typescript
// In docRules.ts, add to defineRules():
{
  id: 'R-CUSTOM-01',
  title: 'Your custom rule',
  when: (app) => app.someField === 'someValue',
  docs: [
    createDoc('CUSTOM_DOC', 'Reason', ['R-CUSTOM-01']),
  ],
}
```

### Override Defaults

```typescript
const overlays = {
  defaultBusinessReturnsYears: 3, // Require 3 years instead of 2
  minBankStmtMonths: 3,
  alwaysRequire2YearsSelfEmployed: true,
};

const result = generateDocChecklist(application, overlays);
```

## Troubleshooting

### Documents Not Showing

1. Check if form data is in correct format
2. Verify required fields are populated
3. Check browser console for errors
4. Use `explain()` to see which rules fired

### Wrong Documents Showing

1. Review rule conditions
2. Check program-specific logic
3. Verify self-employment years calculation
4. Check overlays configuration

### Performance Issues

1. Memoize results with `useMemo`
2. Only regenerate when form data changes
3. Consider debouncing for real-time updates

## Support

For questions or issues:
1. Check the README.md for detailed documentation
2. Review test cases for examples
3. Check the integration guide
4. Contact the development team








