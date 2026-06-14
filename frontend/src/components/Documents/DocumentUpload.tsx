import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  File, 
  Image,
  Loader2,
  Check,
  AlertCircle,
  X,
  Send
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE } from '../../config';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UploadResponse {
  success: boolean;
  filename: string;
  extracted_text: string;
  text_length: number;
  error?: string;
}

interface AnalysisResponse {
  success: boolean;
  answer: string;
  sources: string[];
  document_length: number;
  context_length: number;
  rag_used: boolean;
  error?: string;
}

export function DocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [analysisQuestion, setAnalysisQuestion] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    setUploadResult(null);
    setAnalysisResult(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/documents/upload-document`, {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();
      setUploadResult(result);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        filename: file.name,
        extracted_text: '',
        text_length: 0,
        error: 'Błąd przesyłania pliku'
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  const handleAnalyze = async () => {
    if (!uploadResult?.success || !analysisQuestion.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE}/analyze-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: uploadResult.extracted_text,
          question: analysisQuestion,
          use_rag: true
        }),
      });

      const result: AnalysisResponse = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult({
        success: false,
        answer: 'Wystąpił błąd podczas analizy dokumentu',
        sources: [],
        document_length: 0,
        context_length: 0,
        rag_used: false,
        error: 'Błąd analizy'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'txt':
        return <FileText className="w-8 h-8 text-gray-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
        return <Image className="w-8 h-8 text-green-500" />;
      default:
        return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Przesyłanie Dokumentów</h2>
          <p className="text-gray-600 mt-2">
            Prześlij dokumenty w formatach PDF, DOCX, TXT lub obrazy do analizy prawnej
          </p>
        </div>

        <div className="p-6">
          {/* Upload Area */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 hover:border-gray-400"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="space-y-4">
              {isUploading ? (
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              )}
              
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isUploading ? 'Przesyłanie dokumentu...' : 'Przeciągnij plik tutaj lub kliknij'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PDF, DOCX, DOC, TXT, PNG, JPG, GIF, BMP, TIFF (maks. 10MB)
                </p>
              </div>
            </div>
          </div>

          {/* Upload Result */}
          <AnimatePresence>
            {uploadedFile && uploadResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    {getFileIcon(uploadedFile.name)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {uploadedFile.name}
                        </h3>
                        {uploadResult.success ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-gray-500">
                          Rozmiar: {formatFileSize(uploadedFile.size)}
                        </p>
                        
                        {uploadResult.success ? (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <p className="text-sm text-green-800">
                              ✅ Pomyślnie wyodrębniono {uploadResult.text_length} znaków tekstu
                            </p>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-sm text-red-800">
                              ❌ {uploadResult.error}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setUploadResult(null);
                          setAnalysisResult(null);
                        }}
                        onMouseEnter={() => setHoveredButton('clear-upload')}
                        onMouseLeave={() => setHoveredButton(null)}
                        className="text-gray-400 hover:text-gray-600 p-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                        {hoveredButton === 'clear-upload' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute bottom-full right-0 mb-2 w-32 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                          >
                            <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                              Usuń plik
                            </p>
                            <div className="absolute top-full right-4 -mt-px w-2 h-2 bg-white border-l border-b border-black/10 -rotate-45" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis Section */}
          <AnimatePresence>
            {uploadResult?.success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 space-y-4"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">Analiza Dokumentu</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pytanie do dokumentu:
                      </label>
                      <textarea
                        value={analysisQuestion}
                        onChange={(e) => setAnalysisQuestion(e.target.value)}
                        placeholder="np. Czy umowa jest zgodna z przepisami kodeksu cywilnego?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    </div>
                    
                    <div className="relative inline-block">
                      <button
                        onClick={handleAnalyze}
                        disabled={!analysisQuestion.trim() || isAnalyzing}
                        onMouseEnter={() => setHoveredButton('analyze')}
                        onMouseLeave={() => setHoveredButton(null)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{isAnalyzing ? 'Analizuję...' : 'Analizuj dokument'}</span>
                      </button>
                      <AnimatePresence>
                        {hoveredButton === 'analyze' && !(!analysisQuestion.trim() || isAnalyzing) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute top-full left-0 mt-2 w-48 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                          >
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">
                              Wykonaj Analizę
                            </p>
                            <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider">
                              Wysyła zadane pytanie do analizy wybranego dokumentu.
                            </p>
                            <div className="absolute bottom-full left-6 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Analysis Result */}
                <AnimatePresence>
                  {analysisResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={cn(
                        "rounded-lg p-4",
                        analysisResult.success 
                          ? "bg-green-50 border border-green-200" 
                          : "bg-red-50 border border-red-200"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {analysisResult.success ? 'Wynik analizy' : 'Błąd analizy'}
                          </h4>
                          {analysisResult.rag_used && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              RAG włączony
                            </span>
                          )}
                        </div>
                        
                        {analysisResult.success && (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600">
                              <p>Źródła: {analysisResult.sources.join(', ')}</p>
                              <p>Długość dokumentu: {analysisResult.document_length} znaków</p>
                              <p>Kontekst prawny: {analysisResult.context_length} znaków</p>
                            </div>
                            
                            <div className="bg-white rounded p-3">
                              <p className="text-gray-800 whitespace-pre-wrap">
                                {analysisResult.answer}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {!analysisResult.success && (
                          <p className="text-red-800">
                            {analysisResult.error}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
