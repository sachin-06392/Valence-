import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function ReportButton({ company, comps, privateCompany }) {
  const [loading, setLoading] = useState(false);

  const handleDownloadReport = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/api/generate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          selectedCompany: company,
          comps: comps || [],
          privateCompany: privateCompany || {}
        })
      });

      if (!response.ok) {
        throw new Error("Could not generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const fileName = `valence-report-${company?.ticker || company?.symbol || "company"}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Report failed to generate. Check backend terminal for the error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="report-btn"
      onClick={handleDownloadReport}
      disabled={loading}
    >
      {loading ? "Generating..." : "Download Full Report"}
    </button>
  );
}