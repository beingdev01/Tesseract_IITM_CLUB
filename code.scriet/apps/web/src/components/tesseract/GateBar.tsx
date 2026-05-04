export function GateBar() {
  return (
    <div className="lb-gate-bar">
      <div className="lb-gate-item">
        <span className="lb-gate-label">ACCESS</span>
        <span className="lb-gate-val">restricted</span>
      </div>
      <div className="lb-gate-item">
        <span className="lb-gate-label">DOMAIN</span>
        <span className="lb-gate-val">@ds.study.iitm.ac.in</span>
      </div>
      <div className="lb-gate-item">
        <span className="lb-gate-label">DOMAIN</span>
        <span className="lb-gate-val">@es.study.iitm.ac.in</span>
      </div>
      <div className="lb-gate-item">
        <span className="lb-gate-label">EXT_USERS</span>
        <span className="lb-gate-val lb-deny">denied</span>
      </div>
      <div className="lb-gate-item lb-gate-flex">
        <span className="lb-gate-label">SESSION</span>
        <span className="lb-gate-val">tesseract.v1 · build 26.04</span>
      </div>
    </div>
  );
}
