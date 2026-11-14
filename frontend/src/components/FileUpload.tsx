import { useState } from "react";
interface Props {
  label: string;
  multiple?: boolean;
  loading: boolean;
  onSubmit: (files: File[]) => void;
}
export default function FileUpload({
  label,
  multiple = false,
  loading,
  onSubmit,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  return (
    <section className="card shadow-sm mb-4">
      <div className="card-body p-4">
        <h2 className="h4">{label}</h2>
        <p>
          {multiple
            ? "Select up to 10 student PDFs for the same approved key."
            : "Upload the handwritten teacher key, including total marks, split-ups and internal choices."}{" "}
          PDF only · 20 MiB per file · up to 30 pages per PDF.
        </p>
        <label className="form-label" htmlFor={multiple ? "sheets" : "key"}>
          {multiple ? "Student answer sheets" : "Teacher answer key"}
        </label>
        <input
          id={multiple ? "sheets" : "key"}
          className="form-control"
          type="file"
          accept="application/pdf"
          multiple={multiple}
          disabled={loading}
          onChange={(e) => {
            const chosen = Array.from(e.target.files || []);
            setFiles([]);
            setError("");
            if (
              chosen.length > (multiple ? 10 : 1) ||
              chosen.some(
                (f) =>
                  f.type !== "application/pdf" || f.size > 20 * 1024 * 1024,
              )
            ) {
              setError("Select PDF files within the stated limits.");
              e.target.value = "";
              return;
            }
            setFiles(chosen);
          }}
        />
        <ul className="mt-3">
          {files.map((f, i) => (
            <li key={`${i}-${f.name}`}>
              {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MiB)
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <button
          className="btn btn-primary"
          disabled={!files.length || loading}
          onClick={() => onSubmit(files)}
        >
          {loading
            ? "Processing…"
            : multiple
              ? "Evaluate answer sheets"
              : "Read answer key"}
        </button>
      </div>
    </section>
  );
}
