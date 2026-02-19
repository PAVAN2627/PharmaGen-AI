# PharmaGenAI Backend

Production-ready backend API for pharmacogenomic risk assessment using VCF file analysis and LLM-powered clinical explanations.

## Features

- ✅ **VCF File Parsing** - Parse standard VCF v4.2 files
- ✅ **Variant Analysis** - Identify pharmacogenomic variants across 6 critical genes
- ✅ **Phenotype Determination** - Calculate diplotypes and metabolizer phenotypes
- ✅ **Risk Assessment** - CPIC guideline-based risk classification
- ✅ **LLM Integration** - OpenAI-powered clinical explanations
- ✅ **Multi-Drug Analysis** - Analyze multiple drugs simultaneously
- ✅ **Production Ready** - Error handling, logging, rate limiting, security

## Supported Genes

- **CYP2D6** - Codeine metabolism
- **CYP2C19** - Clopidogrel activation
- **CYP2C9** - Warfarin metabolism
- **SLCO1B1** - Simvastatin transport
- **TPMT** - Azathioprine metabolism
- **DPYD** - Fluorouracil metabolism

## Supported Drugs

- Codeine
- Clopidogrel
- Warfarin
- Simvastatin
- Azathioprine
- Fluorouracil

## Installation

```bash
cd backend
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required environment variables:

```env
PORT=3001
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGIN=http://localhost:8080
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### 1. Analyze VCF File

**POST** `/api/analysis/analyze`

Analyze a VCF file for pharmacogenomic risks.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `vcfFile` (file): VCF file (.vcf or .vcf.gz)
  - `drugs` (string): Comma-separated drug names (e.g., "CODEINE,WARFARIN")
  - `patientId` (string, optional): Patient identifier

**Example using curl:**
```bash
curl -X POST http://localhost:3001/api/analysis/analyze \
  -F "vcfFile=@test-data/sample.vcf" \
  -F "drugs=CODEINE,WARFARIN,CLOPIDOGREL"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "patient_id": "PATIENT_001",
      "drug": "CODEINE",
      "timestamp": "2026-02-19T10:30:00Z",
      "risk_assessment": {
        "risk_label": "Adjust Dosage",
        "confidence_score": 0.87,
        "severity": "moderate"
      },
      "pharmacogenomic_profile": {
        "primary_gene": "CYP2D6",
        "diplotype": "*1/*4",
        "phenotype": "IM",
        "detected_variants": [...]
      },
      "clinical_recommendation": {
        "cpic_guideline_reference": "CPIC Guideline for CYP2D6 and Codeine Therapy (2014)",
        "recommended_action": "Reduce dose by 50% or consider alternative analgesics...",
        "alternative_drugs": ["Morphine", "Hydromorphone", ...]
      },
      "llm_generated_explanation": {
        "summary": "...",
        "biological_mechanism": "...",
        "variant_interpretation": "...",
        "clinical_impact": "..."
      },
      "quality_metrics": {
        "vcf_parsing_success": true,
        "annotation_completeness": 0.95,
        "variants_detected": 2,
        "genes_analyzed": 1
      }
    }
  ],
  "metadata": {
    "analyzed_drugs": 3,
    "timestamp": "2026-02-19T10:30:00Z"
  }
}
```

### 2. Get Supported Drugs

**GET** `/api/analysis/supported-drugs`

Get list of all supported drugs.

**Response:**
```json
{
  "success": true,
  "data": {
    "drugs": ["CODEINE", "CLOPIDOGREL", "WARFARIN", ...],
    "count": 6
  }
}
```

### 3. Validate Drugs

**POST** `/api/analysis/validate-drugs`

Validate drug names before analysis.

**Request:**
```json
{
  "drugs": ["CODEINE", "ASPIRIN", "WARFARIN"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "invalidDrugs": ["ASPIRIN"]
  }
}
```

### 4. Health Check

**GET** `/api/analysis/health`

Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-19T10:30:00Z",
    "service": "pharmagenai-backend"
  }
}
```

## Architecture

```
backend/
├── src/
│   ├── data/
│   │   ├── pharmacogenomicVariants.ts  # Known PGx variant database
│   │   └── drugGeneRules.ts            # CPIC-based risk rules
│   ├── middleware/
│   │   ├── errorHandler.ts             # Error handling
│   │   └── validation.ts               # Request validation
│   ├── parsers/
│   │   └── vcfParser.ts                # VCF file parser
│   ├── routes/
│   │   └── analysis.ts                 # API routes
│   ├── services/
│   │   ├── analysisService.ts          # Main analysis orchestration
│   │   ├── genotypeAnalyzer.ts         # Genotype/phenotype analysis
│   │   └── llmService.ts               # OpenAI integration
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   ├── utils/
│   │   └── logger.ts                   # Winston logger
│   └── server.ts                       # Express server
├── test-data/
│   └── sample.vcf                      # Sample VCF file
├── package.json
├── tsconfig.json
└── .env.example
```

## Testing

Test with the provided sample VCF file:

```bash
curl -X POST http://localhost:3001/api/analysis/analyze \
  -F "vcfFile=@test-data/sample.vcf" \
  -F "drugs=CODEINE,WARFARIN" \
  -F "patientId=TEST_PATIENT_001"
```

## Error Handling

The API returns structured error responses:

```json
{
  "success": false,
  "error": {
    "message": "Invalid VCF format: Missing fileformat header"
  }
}
```

Common error codes:
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Configurable cross-origin requests
- **Rate Limiting** - Prevent abuse
- **File Size Limits** - Max 5MB uploads
- **Input Validation** - Zod schema validation
- **Error Sanitization** - No stack traces in production

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (development mode)

## Performance

- Compression enabled for responses
- Memory-based file uploads (no disk I/O)
- Async/await throughout
- Efficient variant matching algorithms

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production OpenAI API key
3. Set appropriate CORS origin
4. Configure rate limits
5. Set up log rotation
6. Use process manager (PM2, systemd)

```bash
npm run build
NODE_ENV=production npm start
```

## License

MIT
