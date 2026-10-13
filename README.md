# Bulk Budget Buddy

Build a responsive full-stack web app: "Clean Bulk & Personal Expense Tracker" with Supabase backend and authentication.

1. Authentication & User Profile:

- User signup and login (Email/Password via Supabase Auth).

- Store user settings: Monthly Budget (₹), Clean Bulk Target (₹), Daily Protein Goal (g).

2. Expense Logging (Full CRUD):

- Form to log expenses with: Title, Amount (₹), Category ('Clean Bulk Groceries', 'Supplements', 'Dining Out / Cheat Meals', 'General Living'), Date, and optional Protein content (g).

- Interactive table showing all logged expenses with Edit and Delete actions.

3. Analytics & Core Business Logic:

- Metric Card: Daily Burn Rate = (Total Spend in Current Month / Days Elapsed).

- Metric Card: Safe Daily Allowance = (Monthly Budget - Total Spend) / Days Remaining.

- Visual Progress Bars: Budget threshold alerts per category (Green < 75%, Amber 75-99%, Red >= 100%).

- Visual Breakdown Chart: Donut or bar chart showing Nutrition/Bulk spend vs Discretionary spend.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bulk-budget-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6e0cf560-72ef-4117-b10c-967d0e64193f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
