"""Resend email service for low-stock alerts."""
import os
import asyncio
import logging
import resend

logger = logging.getLogger(__name__)
resend.api_key = os.environ.get("RESEND_API_KEY", "")


async def send_email(recipient: str, subject: str, html: str) -> bool:
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return False
    params = {
        "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
        "to": [recipient],
        "subject": subject,
        "html": html,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent: {result}")
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False


def low_stock_html(products: list) -> str:
    rows = "".join(
        f"<tr><td style='padding:8px;border-bottom:1px solid #E2E8F0'>{p.get('name')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #E2E8F0'>{p.get('sku')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #E2E8F0;color:#EF4444;font-weight:600'>{p.get('quantity')}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #E2E8F0'>{p.get('reorder_level')}</td></tr>"
        for p in products
    )
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#F8FAFC">
      <h2 style="color:#10B981;margin:0 0 8px">Low Stock Alert</h2>
      <p style="color:#64748B">The following products are at or below their reorder level:</p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#10B981;color:#fff;text-align:left">
            <th style="padding:10px">Product</th>
            <th style="padding:10px">SKU</th>
            <th style="padding:10px">Quantity</th>
            <th style="padding:10px">Reorder Level</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <p style="color:#64748B;margin-top:24px;font-size:12px">Inventory Ops &middot; Automated Alert</p>
    </div>
    """
