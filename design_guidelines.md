# Gate Management System - Design Guidelines

## 1. Brand Identity

**Purpose**: Streamline entry/exit management for industrial facilities with multiple visitor types (sourcing, maintenance, collection).

**Aesthetic Direction**: Industrial Efficiency
- Bold, high-contrast design for outdoor visibility
- Authoritative and trustworthy feel
- Focus on speed and clarity over decoration
- Professional, not corporate-sterile

**Memorable Element**: Large, bold token numbers that feel like official tickets.

---

## 2. Navigation Architecture

**Root Navigation**: Stack-only (linear flow)

**Screens**:
1. **Visitor Type Selection** - Choose entry purpose
2. **Entry Form** - Collect visitor details (dynamic based on selection)
3. **Token Display** - Show assigned token and agent
4. **Exit Confirmation** - Close ticket on departure

---

## 3. Screen Specifications

### Screen 1: Visitor Type Selection
- **Purpose**: User selects entry reason
- **Layout**:
  - Header: Large title "Gate Entry" (bold, 32pt), transparent background
  - Three large touchable cards vertically stacked with spacing
  - Top inset: insets.top + Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Cards**: Each card displays icon, title (Sourcing/Maintenance/Collection), and right chevron
- **Interaction**: Tap navigates to entry form

### Screen 2: Entry Form
- **Purpose**: Collect visitor information
- **Layout**:
  - Header: Navigation back button (left), title shows selected type
  - Scrollable form with input fields based on selection:
    - Sourcing: Name, Phone Number
    - Maintenance: Name, Phone Number, Vehicle Number
    - Collection: Phone Number, Driver ID
  - Submit button: Fixed at bottom (floating, full-width)
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl + 80 (button height + spacing)
- **Validation**: All fields required before submit enabled

### Screen 3: Token Display
- **Purpose**: Show assigned token and agent assignment
- **Layout**:
  - Header: Transparent, no back button (force forward flow)
  - Center-aligned content:
    - Large token number (96pt, bold)
    - "Proceed to" label
    - Agent name (24pt, medium)
    - Location/gate information
  - Primary button at bottom: "Exit Gate"
  - Top inset: insets.top + Spacing.xl
  - Bottom inset: insets.bottom + Spacing.xl
- **Empty State**: None (always shows data after form submission)

### Screen 4: Exit Confirmation
- **Purpose**: Close ticket and return to start
- **Layout**:
  - Success checkmark icon
  - "Ticket Closed" message
  - Automatic navigation back to Screen 1 after 2 seconds
- **Alternative**: Use native alert instead of full screen

---

## 4. Color Palette

**Primary**: #D97706 (Amber-600, authoritative orange for industrial)
**Primary Dark**: #B45309 (pressed state)
**Background**: #FFFFFF
**Surface**: #F3F4F6 (Gray-100, for cards)
**Border**: #E5E7EB (Gray-200)
**Text Primary**: #111827 (Gray-900)
**Text Secondary**: #6B7280 (Gray-500)
**Success**: #059669 (Green-600)
**Error**: #DC2626 (Red-600)

---

## 5. Typography

**Font**: System default (SF Pro for iOS, Roboto for Android)
- **Title Large**: 32pt, Bold
- **Title**: 24pt, Semibold
- **Token Number**: 96pt, Bold
- **Body**: 16pt, Regular
- **Label**: 14pt, Medium
- **Caption**: 12pt, Regular

---

## 6. Visual Design

- **Cards**: 16pt corner radius, subtle shadow (shadowOpacity: 0.05, shadowRadius: 8)
- **Buttons**: 12pt corner radius, full-width, height 56pt
- **Input Fields**: 8pt corner radius, border 1pt, height 48pt
- **Icons**: Feather icons, 24pt size
- **Spacing Scale**: xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

---

## 7. Assets to Generate

1. **icon.png** - Gate/barrier icon in primary orange, simple geometric design
   - WHERE USED: App icon on device

2. **splash-icon.png** - Same gate icon, centered
   - WHERE USED: Launch screen

3. **sourcing-icon.png** - Document/clipboard illustration
   - WHERE USED: Visitor Type Selection card

4. **maintenance-icon.png** - Wrench/tools illustration
   - WHERE USED: Visitor Type Selection card

5. **collection-icon.png** - Truck/delivery illustration
   - WHERE USED: Visitor Type Selection card

6. **success-checkmark.png** - Large checkmark in success green
   - WHERE USED: Exit Confirmation screen

All icons should be simple, bold, single-color silhouettes matching the industrial aesthetic.