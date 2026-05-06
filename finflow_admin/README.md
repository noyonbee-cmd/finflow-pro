# FinFlow Pro — Admin App

> Full-control dashboard for business owners  
> Flutter 3.22+ · Dart 3.4+ · Riverpod · Dio · go_router

## Architecture

```
lib/
├── core/               → Shared foundation (constants, network, storage, utils)
│   ├── constants/      → Design tokens (colors, typography, spacing, API URLs)
│   ├── errors/         → Failure & exception classes
│   ├── network/        → Dio client with interceptors
│   ├── storage/        → flutter_secure_storage wrapper
│   └── utils/          → Currency/date formatting, validators
├── features/           → Feature-first module structure
│   ├── auth/           → Login, registration, token management
│   ├── dashboard/      → Home dashboard with summary cards
│   ├── transactions/   → CR/DR transaction management
│   ├── clients/        → Client CRUD and history
│   ├── agents/         → Agent management and commission tracking
│   ├── wallets/        → Multi-wallet balance and logs
│   ├── reports/        → PDF reports and analytics
│   └── settings/       → Business config, integrations, preferences
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
