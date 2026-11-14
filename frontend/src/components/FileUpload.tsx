import { useState } from "react";

interface FileUploadProps {
  onEvaluate: (file: File) => void;
  loading: boolean;
}

function FileUpload({
  onEvaluate,
  loading
}: FileUploadProps) {

  const [file, setFile] =
    useState<File | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      alert("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = () => {

    if (!file) {
      alert("Please select an answer sheet.");
      return;
    }

    onEvaluate(file);
  };

  return (
    <div className="card shadow-sm">

      <div className="card-body p-4">

        <h4 className="mb-3">
          Upload Student Answer Sheet
        </h4>

        <p className="text-muted">
          Upload the student's handwritten
          answer sheet as a PDF.
        </p>

        <input
          type="file"
          accept="application/pdf"
          className="form-control"
          onChange={handleFileChange}
          disabled={loading}
        />

        {file && (
          <div className="alert alert-info mt-3 mb-0">

            <strong>Selected file:</strong>

            <br />

            {file.name}

            <br />

            <small>
              {(file.size / 1024 / 1024).toFixed(2)}
              {" "}MB
            </small>

          </div>
        )}

        <button
          className="btn btn-primary w-100 mt-4"
          onClick={handleSubmit}
          disabled={!file || loading}
        >

          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
              />
              Evaluating Answer Sheet...
            </>
          ) : (
            "Evaluate Answer Sheet"
          )}

        </button>

      </div>

    </div>
  );
}

export default FileUpload;