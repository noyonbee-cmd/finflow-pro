# FinFlow Pro — Agent App

> Streamlined app for field agents  
> Flutter 3.22+ · Dart 3.4+ · Riverpod · Dio · go_router

## Architecture

```
lib/
├── core/               → Shared foundation (same as admin app)
│   ├── constants/      → Design tokens (colors, typography, spacing, API URLs)
│   ├── errors/         → Failure & exception classes
│   ├── network/        → Dio client with interceptors
│   ├── storage/        → flutter_secure_storage wrapper
│   └── utils/          → Currency/date formatting, validators
├── features/           → Agent-specific feature modules
│   ├── auth/           → Agent login and session management
│   ├── dashboard/      → Personal earnings dashboard
│   ├── transactions/   → Process transactions for assigned clients
│   ├── clients/        → View/add own clients
│   ├── earnings/       → Commission tracking and settlement requests
│   └── settings/       → Profile, notifications, PIN lock
├── shared/widgets/     → Reusable UI components
├── providers/          → Global Riverpod providers
└── main.dart           → App entry point
```

## Getting Started

```bash
flutter pub get
flutter run
```

## License

Proprietary — All rights reserved.
