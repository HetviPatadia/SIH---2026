import os
import datetime
from pathlib import Path
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.app.config import settings
from backend.app.utils.logger import logger

class AuditPDFReporter:
    """
    Generates formal, printable audit summary PDFs for high-priority cases.
    Includes data provenance, SHAP feature breakdowns, evidence tables,
    and administrative human-in-the-loop disclaimers.
    """

    def __init__(self):
        self.reports_dir = settings.REPORTS_DIR

    def generate_report(
        self,
        project_id: str,
        project_data: Dict[str, Any],
        risk_data: Dict[str, Any],
        auditor_name: str = "Authorized District Auditor",
    ) -> Path:
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        pdf_filename = f"AUDIT_REPORT_{project_id}_{timestamp}.pdf"
        pdf_path = self.reports_dir / pdf_filename

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]

        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=4,
        )

        sub_style = ParagraphStyle(
            "ReportSub",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#64748b"),
        )

        section_heading = ParagraphStyle(
            "SectionHead",
            parent=styles["Heading2"],
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=8,
            spaceAfter=4,
        )

        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Italic"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#b91c1c"),
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("MPLADS AI AUDIT INTELLIGENCE SYSTEM", title_style))
        story.append(Paragraph(
            f"Case Priority Dossier | Generated on: {datetime.datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')} | Reviewer: {auditor_name}",
            sub_style,
        ))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=10))

        # 2. Risk Priority Score Box
        score = risk_data.get("unified_score", 0.0)
        priority = risk_data.get("priority_level", "LOW")
        score_color = colors.HexColor("#dc2626") if priority in ["HIGH", "CRITICAL"] else colors.HexColor("#d97706")

        kpi_data = [
            [
                Paragraph("<b>PROJECT IDENTIFIER:</b>", normal_style),
                Paragraph(f"<b>{project_id}</b>", normal_style),
                Paragraph("<b>ANOMALY PRIORITY SCORE:</b>", normal_style),
                Paragraph(f"<b><font color='{score_color}'>{score:.1f} / 100 ({priority})</font></b>", normal_style),
            ],
            [
                Paragraph("<b>State / District:</b>", normal_style),
                Paragraph(f"{project_data.get('state')} / {project_data.get('district')}", normal_style),
                Paragraph("<b>Sector Category:</b>", normal_style),
                Paragraph(f"{project_data.get('sector')}", normal_style),
            ],
            [
                Paragraph("<b>Sanctioned Amount:</b>", normal_style),
                Paragraph(f"₹{project_data.get('sanctioned_amount', 0):,.2f}", normal_style),
                Paragraph("<b>Assigned Contractor:</b>", normal_style),
                Paragraph(f"{project_data.get('contractor_name', 'N/A')}", normal_style),
            ],
        ]

        t_kpi = Table(kpi_data, colWidths=[130, 140, 140, 130])
        t_kpi.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(t_kpi)
        story.append(Spacer(1, 10))

        # 3. Explanation Summary
        story.append(Paragraph("1. Primary Analytical Finding", section_heading))
        explanation_text = risk_data.get("explanation_summary", "No significant anomalies identified.")
        story.append(Paragraph(f"<b>Audit Signal Summary:</b> {explanation_text}", normal_style))
        story.append(Spacer(1, 10))

        # 4. Multi-Modal Factor Contributions (XAI / SHAP)
        story.append(Paragraph("2. Explainable AI Feature Attribution (SHAP Analysis)", section_heading))
        features = risk_data.get("evidence_breakdown", {}).get("features", [])

        feat_rows = [["Feature Evaluated", "Observed Value", "Attributed Score", "Signal Direction"]]
        for f in features:
            feat_rows.append([
                Paragraph(str(f.get("feature")), normal_style),
                Paragraph(str(f.get("value")), normal_style),
                Paragraph(f"{f.get('contribution', 0):.1f} pts", normal_style),
                Paragraph(str(f.get("direction")), normal_style),
            ])

        t_feat = Table(feat_rows, colWidths=[180, 180, 90, 90])
        t_feat.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        story.append(t_feat)
        story.append(Spacer(1, 10))

        # 5. Evidence Trail
        story.append(Paragraph("3. Specific Evidence Facts", section_heading))
        evidence_items = risk_data.get("evidence_breakdown", {}).get("evidence", [])
        if evidence_items:
            for ev in evidence_items:
                ev_str = f"• <b>[{ev.get('signal')}]:</b> {ev.get('finding')}"
                story.append(Paragraph(ev_str, normal_style))
                story.append(Spacer(1, 2))
        else:
            story.append(Paragraph("No severe analytical engine anomalies flagged.", normal_style))
        story.append(Spacer(1, 10))

        # 6. Asset Evidence Intelligence Dossier
        story.append(Paragraph("4. Asset Evidence Intelligence Dossier", section_heading))
        ev_summary = risk_data.get("evidence_summary", {})
        ev_avail = "Yes" if ev_summary.get("has_evidence") else "None on record"
        ev_reuse = ev_summary.get("reuse_status", "No cross-project reuse detected")
        ev_loc = ev_summary.get("location_consistency", "Location Evidence Unavailable (No EXIF GPS)")
        ev_time = ev_summary.get("temporal_consistency", "Timeline Evidence Unavailable")

        ev_table_data = [
            [Paragraph("<b>Evidence Parameter</b>", normal_style), Paragraph("<b>Observed Audit Finding</b>", normal_style)],
            [Paragraph("Physical Evidence Available", normal_style), Paragraph(str(ev_avail), normal_style)],
            [Paragraph("Potential Photo Reuse", normal_style), Paragraph(str(ev_reuse), normal_style)],
            [Paragraph("Spatial Consistency", normal_style), Paragraph(str(ev_loc), normal_style)],
            [Paragraph("Timeline Consistency", normal_style), Paragraph(str(ev_time), normal_style)],
        ]

        t_ev = Table(ev_table_data, colWidths=[200, 340])
        t_ev.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        story.append(t_ev)
        story.append(Spacer(1, 12))

        # 7. Recommendation & Disclaimer
        story.append(Paragraph("5. Recommended Administrative Action", section_heading))
        story.append(Paragraph(
            "<b>Action Required:</b> Prioritize this project for on-site physical inspection and verification "
            "by the designated District Verification Officer. Cross-check measurement book entries and supplier receipts.",
            normal_style,
        ))
        story.append(Spacer(1, 14))

        disclaimer_box = [
            [Paragraph(
                "<b>STATUTORY AUDIT DISCLAIMER:</b><br/>"
                "This report contains AI-assisted decision support output derived from statistical and multi-modal "
                "anomaly detection models. It flags statistical outliers to optimize audit sample allocation and does "
                "NOT constitute a finding of fraud, criminality, or tender manipulation. All final determinations "
                "rest exclusively with the designated constitutional and statutory authorities.",
                disclaimer_style,
            )]
        ]
        t_disc = Table(disclaimer_box, colWidths=[540])
        t_disc.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef2f2")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#f87171")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t_disc)

        doc.build(story)
        logger.info(f"Generated Audit Summary PDF at: {pdf_path}")
        return pdf_path
