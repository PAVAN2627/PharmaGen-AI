# PharmaAI - Pharmacogenomic Risk Assessment Engine

A modern, AI-powered pharmacogenomics analysis platform that processes genomic data (VCF files) to provide personalized drug interaction risk assessments with clinical explanations powered by Google Gemini.

## 🎯 Overview

PharmaAI analyzes genetic variants to predict drug response and safety risks based on CPIC (Clinical Pharmacogenetics Implementation Consortium) guidelines. The system:

- **Parses VCF files** for genomic variants with intelligent multi-strategy detection
- **Analyzes drug-gene interactions** using curated pharmacogenomic rules
- **Generates risk assessments** (Therapeutic, Toxic, Ineffective) with confidence scoring
- **Produces AI-generated clinical explanations** using Google Gemini
- **Provides instant results** in a responsive web interface

## ✨ Key Features

### Analysis Capabilities
- ✅ **Multi-Gene Support**: CYP2D6, CYP2C19, CYP2C9, TPMT, DPYD, SLCO1B1, and more
- ✅ **Variant Detection**: Multi-strategy approach (exact match, fuzzy matching, allele detection)
- ✅ **Confidence Scoring**: Multi-factor confidence metrics for result reliability
- ✅ **Drug-Gene Mapping**: Comprehensive CPIC drug-gene interaction rules
- ✅ **Risk Stratification**: Categorized risk levels (Therapeutic, Toxic, Ineffective) with reasoning
- ✅ **AI Explanations**: Clinical context and treatment recommendations via Gemini LLM
- ✅ **Quality Metrics**: Detailed analysis metadata and processing statistics

### User Experience
- 🎨 **Modern UI**: React with Tailwind CSS and shadcn-ui components
- 📊 **Results Dashboard**: Real-time visualization of analysis results
- 📥 **Drag-and-Drop Upload**: Simple VCF file submission
- ⚡ **Instant Processing**: Analysis results displayed immediately after upload
- 📱 **Responsive Design**: Works seamlessly on desktop and tablet

## 🏗️ Architecture

### Stateless Design
- **No persistent storage**: Results are computed on-demand and returned to the client
- **No database required**: Simplified deployment with minimal infrastructure
- **Session-based**: Each analysis is independent
- **Scalable**: Stateless backend can be easily scaled horizontally

### Data Flow
```
VCF File Upload → VCF Parsing → Variant Detection → Genotype Analysis 
→ Drug-Gene Mapping → Risk Assessment → LLM Explanation → Results Display
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn-ui** - High-quality UI components
- **Framer Motion** - Smooth animations
- **React Router** - Client-side routing

### Backend
- **Node.js** with Express.js
- **TypeScript** - Type-safe backend
- **Google Gemini 2.0 Flash** - Free-tier AI model for explanations
- **Jest/Vitest** - Comprehensive test suites

### Development
- **npm/bun** - Package management
- **ESLint & Prettier** - Code quality
- **Vitest** - Unit testing (frontend)
- **Jest** - Unit testing (backend)

## 📋 Prerequisites

- **Node.js** v18+ (or bun)
- **npm** or **bun** package manager
- **Google Gemini API Key** (free tier available)

## ⚙️ Installation

### 1. Clone/Setup Project
```bash
cd PharmaAI
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### 3. Configure API Key

Get your free Gemini API key:
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key" and copy it

Create `backend/.env`:
```env
GEMINI_API_KEY=your_api_key_here
PORT=5000
NODE_ENV=development
```

## 🚀 Running the Application

### Terminal 1 - Backend Server
```bash
cd backend
npm start
# or for development with hot-reload:
npm run dev
```
Backend runs on `http://localhost:5000`

### Terminal 2 - Frontend Dev Server
```bash
npm run dev
```
Frontend runs on `http://localhost:8081` (or shown in terminal)

### Access Application
Open browser: `http://localhost:8081`

## 📊 Testing with Sample VCF Files

Example test files are provided in `backend/test-data/`:

### High-Risk Examples
- `test-high-risk-all.vcf` - Multiple HIGH RISK alerts across genes
- `test-evidence-level-a.expected.json` - Level A evidence results

### Gene-Specific Tests
- `test-cyp2d6-variants.vcf` - CYP2D6 variants only
- `test-cyp2c19-variants.vcf` - CYP2C19 variants  
- `test-cyp2c9-variants.vcf` - CYP2C9 variants
- `test-tpmt-variants.vcf` - TPMT variants
- `test-dpyd-variants.vcf` - DPYD variants
- `test-slco1b1-variants.vcf` - SLCO1B1 variants

### Edge Cases
- `test-no-pgx-variants.vcf` - Non-pharmacogenomic variants
- `test-no-variants.vcf` - No variants (clean genome)

## 🧪 Running Tests

### Backend Tests
```bash
cd backend
npm test
```
Includes unit and integration tests for:
- VCF parsing
- Variant detection
- Genotype analysis
- Risk assessment
- API endpoints

### Frontend Tests
```bash
npm run test
```

## 📡 API Endpoints

### Analysis
- **POST** `/api/analysis` - Analyze VCF file
  - Request: Form data with `file` (VCF) and `drugs` (JSON array)
  - Response: Array of AnalysisResult objects

### Health Check
- **GET** `/api/health` - Server status
- **GET** `/api/health/gemini` - Verify Gemini API connectivity

## 📁 Project Structure

```
PharmaAI/
├── src/                           # Frontend source
│   ├── components/
│   │   ├── dashboard/            # Dashboard components
│   │   │   ├── UploadSection.tsx
│   │   │   ├── DrugResultsTable.tsx
│   │   │   ├── DashboardCharts.tsx
│   │   │   └── ...
│   │   └── ui/                   # Reusable UI components
│   ├── services/
│   │   └── api.ts                # API client functions
│   ├── types/
│   │   └── api.ts                # TypeScript types
│   ├── contexts/
│   │   └── DashboardContext.tsx
│   └── pages/
│       ├── Dashboard.tsx
│       └── Index.tsx
│
├── backend/                        # Backend source
│   ├── src/
│   │   ├── server.ts             # Express app setup
│   │   ├── services/
│   │   │   ├── analysisService.ts    # Core analysis logic
│   │   │   ├── geminiService.ts      # LLM integration
│   │   │   └── ...
│   │   ├── parsers/
│   │   │   └── vcfParser.ts      # VCF file parsing
│   │   ├── routes/
│   │   │   └── analysis.ts       # Analysis endpoints
│   │   ├── data/
│   │   │   ├── drugGeneRules.ts
│   │   │   └── pharmacogenomicVariants.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── logger.ts
│   ├── test-data/                # Sample VCF files
│   └── logs/                     # Application logs
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

## 🔧 Troubleshooting

### "Gemini API Key Invalid"
- Verify key is correctly set in `backend/.env`
- Check key hasn't been disabled or revoked
- Generate a new key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### "VCF File Parse Error"
- Ensure VCF file is valid format (use test files as reference)
- Check file is not corrupted
- Verify required VCF columns are present

### "Analysis Results Not Appearing"
- Check browser console (F12) for errors
- Verify backend server is running and accessible
- Check `backend/logs/combined.log` for server errors
- Restart both frontend and backend servers

### "Port Already in Use"
Change port in `backend/.env`:
```env
PORT=5001
```
Or kill process using the port.

## 📝 Result Format

Each analysis returns standardized results:

```typescript
{
  patient_id: string;          // Unique patient identifier
  drug: string;                // Drug name analyzed
  genes: string[];             // Relevant genes
  variants: Variant[];         // Detected variants
  genotypes: Genotype[];        // Inferred genotypes
  risk_assessment: {
    risk_label: string;        // Therapeutic | Toxic | Ineffective
    confidence_score: number;  // 0-100
    reasoning: string;         // Why this risk level
    recommendations: string[]
  };
  ai_explanation: string;      // Gemini-generated explanation
  timestamp: string;           // ISO8601 datetime
  metadata: {
    total_variants: number;
    coverage: number;
    quality_score: number
  }
}
```

## 🎓 Understanding Results

### Risk Labels
- **Therapeutic**: Drug is expected to be effective at standard dosing
- **Toxic**: Drug or standard dose may cause toxicity/harm
- **Ineffective**: Drug is unlikely to be effective (consider alternatives)

### Confidence Score
- **90-100**: High confidence, well-supported by evidence
- **70-89**: Moderate confidence, generally reliable
- **50-69**: Lower confidence, recommend specialist review
- **<50**: Use with caution, limit clinical applicability

## 🌟 Recent Updates (v1.0)

- ✅ Removed Firebase/Firestore persistence layer
- ✅ Simplified to stateless architecture
- ✅ Removed patient history feature - results are session-based
- ✅ Removed authentication requirement
- ✅ Focused on core analysis quality and speed

## 📚 References

- [CPIC Guidelines](https://cpicpgx.org) - Clinical Pharmacogenetics Implementation
- [PharmGKB](https://www.pharmgkb.org) - Pharmacogenomics Knowledge Base
- [VCF Format](http://samtools.github.io/hts-specs/VCFv4.2.pdf) - Variant Call Format

## 👨‍💻 Development

### Code Quality
```bash
npm run lint          # Check for linting issues
npm run format        # Format code with Prettier
npm run type-check    # Run TypeScript type checking
```

### Building for Production
```bash
npm run build         # Frontend build
cd backend && npm run build  # Backend build
```

## 📄 License

[Your License Here]

## 🤝 Support

For issues, questions, or contributions:
- Check existing documentation
- Review test files for usage examples
- Check logs in `backend/logs/` for debug information
