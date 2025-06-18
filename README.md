# AI Assessment Marker

An automated student assessment and project marking system built with Next.js and OpenAI's API.

## Features

- 🤖 **AI-Powered Marking**: Uses OpenAI GPT-4 for intelligent assessment marking
- 📄 **PDF Processing**: Extracts text from uploaded PDF assessments
- 🎯 **Dual Mode**: Supports both assessment and project evaluation
- 📊 **Structured Feedback**: Generates detailed, structured marking reports
- 📁 **Batch Processing**: Mark multiple students simultaneously
- 💾 **PDF Generation**: Creates downloadable marked assessment reports
- 🎨 **Professional UI**: Clean, intuitive interface with step-by-step workflow

## Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Processing**: pdf-parse
- **PDF Generation**: jsPDF
- **AI Integration**: OpenAI API
- **Icons**: Lucide React

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- OpenAI API key

### 2. Installation

```bash
# Clone the repository (if using git)
git clone <repository-url>
cd ai-marker

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
NEXT_PUBLIC_APP_NAME="AI Assessment Marker"
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_MAX_FILES=20
```

**Important**: Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 4. Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`.

## Usage Guide

### 1. Setup Phase
- Choose between "Assessment" or "Project" marking mode
- Select or create a marking prompt template
- Default prompts are provided for both assessment types

### 2. File Upload Phase
- Upload PDF files following the naming convention: `StudentName_AssignmentTitle.pdf`
- Examples:
  - `JohnSmith_WebDevelopmentProject.pdf`
  - `MarySue_DatabaseAssessment.pdf`
- Multiple files can be uploaded simultaneously
- Maximum file size: 10MB per file
- Maximum files: 20 per session

### 3. Marking Phase
- AI automatically processes each uploaded file
- Extracts text content from PDFs
- Applies selected marking criteria
- Generates structured feedback

### 4. Results Phase
- Review marking results for each student
- Download individual PDF reports
- Batch download all marked assessments
- Results include scores, detailed feedback, and recommendations

## File Naming Convention

**Critical**: Files must follow the exact naming pattern:

✅ **Correct**: `StudentName_AssignmentTitle.pdf`
- `JohnDoe_WebDevelopmentProject.pdf`
- `BusisiweNgwane_CyberSecurityAssessment.pdf`
- `AliceSmith_ReactPortfolio.pdf`

❌ **Incorrect**:
- `John Doe_Project.pdf` (contains spaces)
- `JohnDoe-Project.pdf` (uses hyphen instead of underscore)
- `Assignment.pdf` (missing student name)
- `JohnDoe.pdf` (missing assignment title)

## Marking Templates

### Assessment Template
- Focuses on direct answer evaluation
- Structured mark allocation
- Question-by-question breakdown
- Total score calculation
- Percentage grading

### Project Template
- Multi-dimensional evaluation:
  - Frontend Review (30%)
  - Backend Review (30%)
  - UI/UX Review (20%)
  - Functionality (20%)
- Strengths and improvement areas
- Actionable recommendations
- Final grade calculation

## API Endpoints

- `POST /api/openai` - Process marking requests
- `POST /api/upload` - Handle file uploads and text extraction
- `POST /api/generate-pdf` - Generate PDF reports

## Project Structure

```
ai-marker/
├── app/
│   ├── api/                 # API routes
│   │   ├── openai/         # OpenAI integration
│   │   ├── upload/         # File upload handling
│   │   └── generate-pdf/   # PDF generation
│   ├── components/         # React components
│   │   └── ui/            # Reusable UI components
│   ├── lib/               # Core libraries
│   │   ├── openai.ts      # OpenAI service
│   │   ├── pdf-parser.ts  # PDF processing
│   │   ├── pdf-generator.ts # PDF creation
│   │   ├── storage.ts     # Data persistence
│   │   └── types.ts       # TypeScript definitions
│   ├── hooks/             # Custom React hooks
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # App layout
│   └── page.tsx           # Main application
├── public/                # Static assets
├── .env.local            # Environment variables
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies
```

## Development Status

### ✅ Completed
- Project setup and configuration
- Core type definitions
- API route structure
- PDF processing utilities
- OpenAI integration
- Basic UI layout and workflow
- Environment configuration

### 🚧 In Progress / TODO
- Full component implementations:
  - PromptManager component
  - FileUploader component
  - MarkingInterface component
  - ResultsDisplay component
- Custom hooks implementation
- Enhanced error handling
- Testing suite
- Deployment configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Considerations

- API keys are stored in environment variables
- File upload validation and sanitization
- Rate limiting for OpenAI API calls
- Input sanitization for all user data

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**: Ensure your API key is valid and has sufficient credits
2. **PDF Parse Errors**: Verify PDF files are not corrupted and contain extractable text
3. **File Upload Issues**: Check file naming convention and size limits
4. **Build Errors**: Ensure all dependencies are installed correctly

### Support

For issues and questions, please:
1. Check the troubleshooting section
2. Review the file naming requirements
3. Verify environment configuration
4. Create an issue in the repository

## License

This project is licensed under the MIT License.

---

**Built with ❤️ using Next.js and OpenAI**
