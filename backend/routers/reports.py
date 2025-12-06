from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List
import io
import base64
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime
import os
from groq import Groq

router = APIRouter()

class ReportRequest(BaseModel):
    attack_summary: Dict[str, int]
    classification_report: Dict
    threat_statistics: Dict
    attack_counts: Dict[str, int]
    protocol_counts: Dict[str, int]

def create_pie_chart(data: Dict[str, int], title: str) -> str:
    """Create a pie chart and return as base64 image"""
    fig, ax = plt.subplots(figsize=(6, 4))
    
    labels = list(data.keys())
    sizes = list(data.values())
    colors_list = ['#00C851', '#ff4444', '#ff8800', '#33b5e5', '#aa66cc', '#2BBBAD']
    
    ax.pie(sizes, labels=labels, autopct='%1.1f%%', colors=colors_list[:len(labels)], startangle=90)
    ax.set_title(title, fontsize=14, fontweight='bold')
    
    # Save to bytes
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)
    plt.close()
    
    return buf

def create_bar_chart(data: Dict[str, int], title: str, color='#33b5e5') -> str:
    """Create a bar chart and return as base64 image"""
    fig, ax = plt.subplots(figsize=(8, 4))
    
    labels = list(data.keys())
    values = list(data.values())
    
    ax.barh(labels, values, color=color)
    ax.set_xlabel('Count', fontsize=10)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.grid(axis='x', alpha=0.3)
    
    # Save to bytes
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)
    plt.close()
    
    return buf

@router.post("/generate-pdf")
async def generate_pdf_report(data: ReportRequest):
    try:
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a2e'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2d4059'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=11,
            leading=16,
            spaceAfter=12,
            alignment=TA_LEFT
        )
        
        # Build content
        content = []
        
        # Title
        content.append(Paragraph("Network Intrusion Detection System", title_style))
        content.append(Paragraph("Comprehensive Threat Analysis Report", styles['Heading2']))
        content.append(Spacer(1, 0.2*inch))
        
        # Metadata
        meta_data = [
            ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ['Total Flows Analyzed:', str(data.threat_statistics.get('total', 0))],
            ['Malicious Flows:', str(data.threat_statistics.get('malicious', 0))],
            ['Benign Flows:', str(data.threat_statistics.get('benign', 0))],
        ]
        
        meta_table = Table(meta_data, colWidths=[2*inch, 3*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8eaf6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        content.append(meta_table)
        content.append(Spacer(1, 0.3*inch))
        
        # Executive Summary (AI Generated)
        content.append(Paragraph("Executive Summary", heading_style))
        
        # Generate AI summary using Groq
        api_key = os.getenv("GROQ_API_KEY")
        client = Groq(api_key=api_key)
        
        summary_prompt = f"""Generate a professional executive summary for a network security report with these statistics:

Total Flows: {data.threat_statistics.get('total', 0)}
Malicious: {data.threat_statistics.get('malicious', 0)}
Attack Distribution: {data.attack_summary}

Provide a 3-4 sentence executive summary in plain text (no markdown) covering:
1. Overall security posture
2. Key threats detected
3. Critical recommendations

Keep it professional and concise."""

        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": summary_prompt}],
                model="llama-3.1-8b-instant",
                temperature=0.7,
                max_tokens=200
            )
            summary_text = response.choices[0].message.content
        except:
            summary_text = f"Analysis of {data.threat_statistics.get('total', 0)} network flows revealed {data.threat_statistics.get('malicious', 0)} malicious activities. The system successfully identified multiple attack vectors requiring immediate attention."
        
        content.append(Paragraph(summary_text, body_style))
        content.append(Spacer(1, 0.2*inch))
        
        # Attack Distribution Chart
        content.append(Paragraph("Attack Distribution Analysis", heading_style))
        pie_buf = create_pie_chart(data.attack_counts, "Attack Type Distribution")
        img = Image(pie_buf, width=5*inch, height=3.3*inch)
        content.append(img)
        content.append(Spacer(1, 0.2*inch))
        
        # Attack Statistics Table
        attack_data = [['Attack Type', 'Count', 'Percentage']]
        total = sum(data.attack_counts.values())
        for attack, count in sorted(data.attack_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = f"{(count/total*100):.1f}%" if total > 0 else "0%"
            attack_data.append([attack, str(count), percentage])
        
        attack_table = Table(attack_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
        attack_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        content.append(attack_table)
        content.append(PageBreak())
        
        # Protocol Distribution
        content.append(Paragraph("Protocol Distribution Analysis", heading_style))
        bar_buf = create_bar_chart(data.protocol_counts, "Top Protocols by Flow Count", '#33b5e5')
        img2 = Image(bar_buf, width=6*inch, height=3*inch)
        content.append(img2)
        content.append(Spacer(1, 0.3*inch))
        
        # Recommendations
        content.append(Paragraph("Security Recommendations", heading_style))
        recommendations = [
            "Implement rate limiting and DDoS protection for high-volume attack vectors",
            "Enable multi-factor authentication to prevent brute force attacks",
            "Deploy Web Application Firewall (WAF) rules for detected web attack patterns",
            "Conduct regular security audits and penetration testing",
            "Update intrusion detection signatures based on identified attack patterns"
        ]
        
        for i, rec in enumerate(recommendations, 1):
            content.append(Paragraph(f"{i}. {rec}", body_style))
        
        content.append(Spacer(1, 0.3*inch))
        
        # Footer
        content.append(Spacer(1, 0.5*inch))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.grey, alignment=TA_CENTER)
        content.append(Paragraph("This report was generated by SkyFort IDS - Network Intrusion Detection System", footer_style))
        content.append(Paragraph(f"Report ID: RPT-{datetime.now().strftime('%Y%m%d-%H%M%S')}", footer_style))
        
        # Build PDF
        doc.build(content)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        # Return as base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "pdf": pdf_base64,
            "filename": f"threat_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
async def generate_text_report(data: ReportRequest):
    """Generate a text-based threat report"""
    try:
        api_key = os.getenv("GROQ_API_KEY")
        client = Groq(api_key=api_key)
        
        # Prepare statistics
        total = data.threat_statistics.get('total', 0)
        malicious = data.threat_statistics.get('malicious', 0)
        benign = data.threat_statistics.get('benign', 0)
        
        # Create attack summary string
        attack_summary = ", ".join([f"{k}: {v}" for k, v in data.attack_counts.items()])
        
        prompt = f"""Generate a professional cybersecurity threat analysis report based on these statistics:

Total Network Flows Analyzed: {total}
Malicious Flows Detected: {malicious}
Benign Flows: {benign}
Attack Distribution: {attack_summary}

Create a comprehensive report with the following sections:
1. Executive Summary (2-3 sentences)
2. Threat Overview (detailed analysis of detected attacks)
3. Attack Pattern Analysis (breakdown by type)
4. Risk Assessment
5. Recommended Actions (5-7 specific mitigation strategies)
6. Conclusion

Format the report professionally with clear section headers. Keep it factual and actionable."""

        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=1500
        )
        
        report_text = response.choices[0].message.content
        
        # Add header and footer
        full_report = f"""
╔══════════════════════════════════════════════════════════════════╗
║          NETWORK INTRUSION DETECTION SYSTEM (IDS)                ║
║                  THREAT ANALYSIS REPORT                          ║
╚══════════════════════════════════════════════════════════════════╝

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Report ID: RPT-{datetime.now().strftime('%Y%m%d-%H%M%S')}

{report_text}

═══════════════════════════════════════════════════════════════════
This report was automatically generated by SkyFort IDS
For questions or concerns, contact your security team
═══════════════════════════════════════════════════════════════════
"""
        
        return {"report": full_report}
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
