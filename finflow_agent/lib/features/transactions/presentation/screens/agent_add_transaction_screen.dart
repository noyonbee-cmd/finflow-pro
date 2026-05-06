import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class AgentAddTransactionScreen extends ConsumerStatefulWidget {
  const AgentAddTransactionScreen({super.key});

  @override
  ConsumerState<AgentAddTransactionScreen> createState() =>
      _AgentAddTransactionScreenState();
}

class _AgentAddTransactionScreenState
    extends ConsumerState<AgentAddTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  String _transactionType = 'Cash In';
  String? _selectedClientId;

  final double _commissionRate = 0.005; // 0.5% mock commission
  double _commissionPreview = 0.0;

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _calculateCommission(String val) {
    final amount = double.tryParse(val) ?? 0.0;
    setState(() {
      _commissionPreview = amount * _commissionRate;
    });
  }

  Future<void> _submitTransaction() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClientId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a client')));
      return;
    }

    // Submit logic
    context.pop();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Transaction created successfully')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'New Transaction',
          style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Type Selector
              _buildTypeSelector(),
              const SizedBox(height: AppSpacing.xl),

              // Client Selector
              Text(
                'Client',
                style: AppTextStyles.bodySmMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(color: AppColors.border, width: 0.5),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedClientId,
                    hint: Text(
                      'Select assigned client',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                    isExpanded: true,
                    dropdownColor: AppColors.surface,
                    icon: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: AppColors.textTertiary,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                    ),
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.textPrimary,
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: '1',
                        child: Text('Client A (+8801711111111)'),
                      ),
                      const DropdownMenuItem(
                        value: '2',
                        child: Text('Client B (+8801722222222)'),
                      ),
                    ],
                    onChanged: (val) => setState(() => _selectedClientId = val),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Amount Input
              AppTextField(
                controller: _amountController,
                label: 'Amount',
                hint: '0.00',
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                prefixIcon: Icons.money_rounded,
                onChanged: _calculateCommission,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Required';
                  if (double.tryParse(value) == null) return 'Invalid amount';
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.lg),

              // Note Input
              AppTextField(
                controller: _noteController,
                label: 'Note (Optional)',
                hint: 'Transaction remarks',
                maxLines: 2,
              ),
              const SizedBox(height: AppSpacing.xl),

              // Commission Preview
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(
                    color: const Color(0xFF7C3AED).withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.monetization_on_rounded,
                          color: Color(0xFF7C3AED),
                          size: 20,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          'Commission Preview',
                          style: AppTextStyles.bodySmMedium.copyWith(
                            color: const Color(0xFF7C3AED),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '+ ৳ ${_commissionPreview.toStringAsFixed(2)}',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: const Color(0xFF7C3AED),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),

              // Submit Button
              AppButton(
                label: 'Create Transaction',
                onPressed: _submitTransaction,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() {
                _transactionType = 'Cash In';
                _amountController.clear();
                _calculateCommission('0');
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _transactionType == 'Cash In'
                      ? AppColors.success.withValues(alpha: 0.1)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Center(
                  child: Text(
                    'Cash In',
                    style: AppTextStyles.bodySmMedium.copyWith(
                      color: _transactionType == 'Cash In'
                          ? AppColors.success
                          : AppColors.textTertiary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() {
                _transactionType = 'Cash Out';
                _amountController.clear();
                _calculateCommission('0');
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _transactionType == 'Cash Out'
                      ? AppColors.error.withValues(alpha: 0.1)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Center(
                  child: Text(
                    'Cash Out',
                    style: AppTextStyles.bodySmMedium.copyWith(
                      color: _transactionType == 'Cash Out'
                          ? AppColors.error
                          : AppColors.textTertiary,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
