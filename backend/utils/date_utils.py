import calendar
from datetime import datetime

def safe_date(year, month, day):
    """Returns a valid datetime object, adjusting the day to the last day of the month if necessary."""
    _, last_day = calendar.monthrange(year, month)
    return datetime(year, month, min(day, last_day))

def calculate_due_date(tx_date: datetime, closing_day: int, due_day: int):
    """
    Calculates the due_date for a credit card transaction based on closing and due days.
    If tx_date <= closing_date of its month, it belongs to the current month's bill.
    Otherwise, it belongs to the next month's bill.
    """
    m, y = tx_date.month, tx_date.year
    closing_date = safe_date(y, m, closing_day)
    
    if tx_date <= closing_date:
        # Current month's bill
        target_m, target_y = m, y
    else:
        # Next month's bill
        target_m = m + 1 if m < 12 else 1
        target_y = y if m < 12 else y + 1
    
    # Target closing day for the bill this tx belongs to
    target_closing_day = closing_day
    
    if due_day > target_closing_day:
        return safe_date(target_y, target_m, due_day)
    else:
        # Due date is in the month following the closing month
        nm = target_m + 1 if target_m < 12 else 1
        ny = target_y if target_m < 12 else target_y + 1
        return safe_date(ny, nm, due_day)
