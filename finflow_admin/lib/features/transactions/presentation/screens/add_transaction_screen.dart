/// Add Transaction Screen — Full CR/DR transaction entry with live fee preview.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../features/transactions/data/transaction_models.dart';
import '../../../../features/clients/data/client_models.dart';
import '../../../../features/clients/data/client_repository.dart';
import '../../../../features/agents/data/agent_models.dart';
import '../../../../features/agents/data/agent_repository.dart';
import '../../../../providers/transaction_provider.dart';
import '../../../../providers/wallet_provider.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/widgets/fee_calculator_widget.dart';

class AddTransactionScreen extends ConsumerStatefulWidget {
  const AddTransactionScreen({super.key});
  @override
  ConsumerState<AddTransactionScreen> createState() =>
      _AddTransactionScreenState();
}

class _AddTransactionScreenState extends ConsumerState<AddTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  String _type = 'CR';
  Client? _selectedClient;
  Agent? _selectedAgent;
  String? _selectedWalletId;
  final _amountController = TextEditingController();
  final _feeRateController = TextEditingController(text: '1.5');
  final _extraFeeController = TextEditingController();
  final _noteController = TextEditingController();
  bool _isExtraFeeAdd = true;
  bool _showExtraFee = false;
  String _feeSource = 'Global Default';
  int _amountPaisa = 0;

  List<Client> _clients = [];
  List<Agent> _agents = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final clientRepo = ref.read(clientRepositoryProvider);
      final agentRepo = ref.read(agentRepositoryProvider);
      final results = await Future.wait([
        clientRepo.getClients(),
        agentRepo.getAgents(),
      ]);
      setState(() {
        _clients = results[0] as List<Client>;
        _agents = results[1] as List<Agent>;
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _amountController.dispose();
    _feeRateController.dispose();
    _extraFeeController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _onAmountChanged(String val) {
    final paisa = CurrencyFormatter.parseBDT(val);
    setState(() => _amountPaisa = paisa);
  }

  void _showClientPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.darkBg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        String search = '';
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final filtered = _clients
                .where(
                  (c) =>
                      c.name.toLowerCase().contains(search.toLowerCase()) ||
                      (c.phone ?? '').contains(search),
                )
                .toList();
            return DraggableScrollableSheet(
              initialChildSize: 0.7,
              minChildSize: 0.4,
              maxChildSize: 0.9,
              expand: false,
              builder: (_, controller) => Column(
                children: [
                  const SizedBox(height: 12),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: TextField(
                      style: AppTextStyles.bodyBase.copyWith(
                        color: AppColors.textPrimary,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search clients...',
                        hintStyle: AppTextStyles.bodySm.copyWith(
                          color: AppColors.textMuted,
                        ),
                        prefixIcon: const Icon(
                          Icons.search_rounded,
                          color: AppColors.textTertiary,
                          size: 20,
                        ),
                        filled: true,
                        fillColor: AppColors.surface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onChanged: (v) => setSheetState(() => search = v),
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      controller: controller,
                      itemCount: filtered.length,
                      itemBuilder: (_, i) {
                        final client = filtered[i];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.primary.withValues(
                              alpha: 0.15,
                            ),
                            child: Text(
                              client.name[0],
                              style: AppTextStyles.labelBase.copyWith(
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          title: Text(
                            client.name,
                            style: AppTextStyles.bodyBaseMedium.copyWith(
                              color: AppColors.textPrimary,
                            ),
                          ),
                          subtitle: client.phone != null
                              ? Text(
                                  client.phone!,
                                  style: AppTextStyles.bodyXs.copyWith(
                                    color: AppColors.textTertiary,
                                  ),
                                )
                              : null,
                          onTap: () {
                            setState(() {
                              _selectedClient = client;
                              if (client.customFeePercent != null) {
                                _feeRateController.text = client
                                    .customFeePercent!
                                    .toString();
                                _feeSource = 'Client Profile';
                              }
                            });
                            Navigator.pop(ctx);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showConfirmation() {
    final feeRate = double.tryParse(_feeRateController.text) ?? 0;
    final extraPaisa = CurrencyFormatter.parseBDT(_extraFeeController.text);
    final baseFee = ((_amountPaisa / 1000) * feeRate).round();
    int totalFee = _isExtraFeeAdd ? baseFee + extraPaisa : baseFee - extraPaisa;
    if (totalFee < 0) totalFee = 0;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.darkBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: AppSpacing.paddingBottomSheet,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Confirm Transaction',
              style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: 16),
            _confirmRow(
              'Type',
              _type,
              _type == 'CR' ? AppColors.profitGreen : AppColors.feeRed,
            ),
            _confirmRow(
              'Client',
              _selectedClient?.name ?? '-',
              AppColors.textPrimary,
            ),
            _confirmRow(
              'Amount',
              CurrencyFormatter.formatBDT(_amountPaisa),
              AppColors.textPrimary,
            ),
            _confirmRow(
              'Fee Rate',
              '${_feeRateController.text}%',
              AppColors.textSecondary,
            ),
            _confirmRow(
              'Total Fee',
              CurrencyFormatter.formatBDT(totalFee),
              AppColors.feeRed,
            ),
            if (_selectedAgent != null)
              _confirmRow('Agent', _selectedAgent!.name, AppColors.secondary),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    label: 'Edit',
                    variant: AppButtonVariant.outline,
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: AppButton(
                    label: 'Confirm',
                    onPressed: () {
                      Navigator.pop(ctx);
                      _submit();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _confirmRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTextStyles.bodySm.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: AppTextStyles.bodyBaseSemibold.copyWith(color: color),
          ),
        ],
      ),
    );
  }

  void _submit() {
    if (!_formKey.currentState!.validate() || _selectedClient == null) return;
    final feeRate = double.tryParse(_feeRateController.text) ?? 0;
    final extraPaisa = CurrencyFormatter.parseBDT(_extraFeeController.text);

    ref
        .read(addTransactionProvider.notifier)
        .submit(
          CreateTransactionRequest(
            type: _type,
            clientId: _selectedClient!.id,
            amountPaisa: _amountPaisa,
            feePercent: feeRate,
            extraFeePaisa: extraPaisa > 0 ? extraPaisa : null,
            extraFeeNote: _noteController.text.isNotEmpty
                ? _noteController.text
                : null,
            isExtraFeeAdd: _isExtraFeeAdd,
            agentId: _selectedAgent?.id,
            walletId: _selectedWalletId ?? '',
            note: _noteController.text.isNotEmpty ? _noteController.text : null,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final addState = ref.watch(addTransactionProvider);
    final walletState = ref.watch(walletListProvider);
    final feeRate = double.tryParse(_feeRateController.text) ?? 0;
    final extraPaisa = CurrencyFormatter.parseBDT(_extraFeeController.text);

    // Handle success
    ref.listen(addTransactionProvider, (_, next) {
      if (next.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction created successfully')),
        );
        ref.read(transactionListProvider.notifier).refresh();
        context.pop();
      } else if (next.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: AppColors.feeRed,
          ),
        );
      }
    });

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'New Transaction',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.base),
          children: [
            // CR/DR toggle
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: AppSpacing.cardBorderRadius,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _type = 'CR'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _type == 'CR'
                              ? AppColors.profitGreen
                              : Colors.transparent,
                          borderRadius: AppSpacing.cardBorderRadius,
                        ),
                        child: Center(
                          child: Text(
                            'CR (Money In)',
                            style: AppTextStyles.buttonBase.copyWith(
                              color: _type == 'CR'
                                  ? AppColors.white
                                  : AppColors.textTertiary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _type = 'DR'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _type == 'DR'
                              ? AppColors.feeRed
                              : Colors.transparent,
                          borderRadius: AppSpacing.cardBorderRadius,
                        ),
                        child: Center(
                          child: Text(
                            'DR (Money Out)',
                            style: AppTextStyles.buttonBase.copyWith(
                              color: _type == 'DR'
                                  ? AppColors.white
                                  : AppColors.textTertiary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Client selector
            Text(
              'Client',
              style: AppTextStyles.labelBase.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: _showClientPicker,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusButton),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Icon(
                      _selectedClient != null
                          ? Icons.person_rounded
                          : Icons.person_add_rounded,
                      color: AppColors.textTertiary,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _selectedClient?.name ?? 'Select client...',
                        style: AppTextStyles.bodyBase.copyWith(
                          color: _selectedClient != null
                              ? AppColors.textPrimary
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                    const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: AppColors.textTertiary,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Amount input
            AppTextField(
              controller: _amountController,
              label: 'Amount (৳)',
              hint: '0.00',
              keyboardType: TextInputType.number,
              style: AppTextStyles.numberXl.copyWith(
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[\d.,]')),
              ],
              onChanged: _onAmountChanged,
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (CurrencyFormatter.parseBDT(v) <= 0)
                  return 'Enter a valid amount';
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Fee rate
            Row(
              children: [
                Expanded(
                  child: AppTextField(
                    controller: _feeRateController,
                    label: 'Fee Rate (%)',
                    hint: '1.5',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 12),
                Padding(
                  padding: const EdgeInsets.only(top: 22),
                  child: Text(
                    'From: $_feeSource',
                    style: AppTextStyles.bodyXs.copyWith(
                      color: AppColors.textMuted,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Extra fee toggle
            GestureDetector(
              onTap: () => setState(() => _showExtraFee = !_showExtraFee),
              child: Row(
                children: [
                  Icon(
                    _showExtraFee
                        ? Icons.remove_circle_outline
                        : Icons.add_circle_outline,
                    color: AppColors.warningAmber,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Extra Fee',
                    style: AppTextStyles.bodyBaseMedium.copyWith(
                      color: AppColors.warningAmber,
                    ),
                  ),
                ],
              ),
            ),
            if (_showExtraFee) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  ChoiceChip(
                    label: Text(
                      'Add',
                      style: AppTextStyles.bodyXs.copyWith(
                        color: _isExtraFeeAdd
                            ? AppColors.white
                            : AppColors.textSecondary,
                      ),
                    ),
                    selected: _isExtraFeeAdd,
                    selectedColor: AppColors.profitGreen,
                    backgroundColor: AppColors.surface,
                    onSelected: (_) => setState(() => _isExtraFeeAdd = true),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: Text(
                      'Deduct',
                      style: AppTextStyles.bodyXs.copyWith(
                        color: !_isExtraFeeAdd
                            ? AppColors.white
                            : AppColors.textSecondary,
                      ),
                    ),
                    selected: !_isExtraFeeAdd,
                    selectedColor: AppColors.feeRed,
                    backgroundColor: AppColors.surface,
                    onSelected: (_) => setState(() => _isExtraFeeAdd = false),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppTextField(
                      controller: _extraFeeController,
                      hint: '0.00',
                      keyboardType: TextInputType.number,
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 20),

            // Live fee preview
            if (_amountPaisa > 0)
              FeeCalculatorWidget(
                amountPaisa: _amountPaisa,
                feePercent: feeRate,
                extraFeePaisa: extraPaisa,
                isExtraFeeAdd: _isExtraFeeAdd,
                commissionPercent: _selectedAgent != null ? 0.5 : 0,
                transactionType: _type,
                feeSource: 'From: $_feeSource',
              ),
            const SizedBox(height: 20),

            // Wallet selector
            Text(
              'Payment Source',
              style: AppTextStyles.labelBase.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: walletState.wallets.map((w) {
                final isSelected = _selectedWalletId == w.id;
                return ChoiceChip(
                  label: Text(
                    '${w.name} (${CurrencyFormatter.formatBDTCompact(w.balancePaisa)})',
                    style: AppTextStyles.bodyXs.copyWith(
                      color: isSelected
                          ? AppColors.white
                          : AppColors.textSecondary,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.surface,
                  onSelected: (_) => setState(() => _selectedWalletId = w.id),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Agent selector
            Text(
              'Agent (optional)',
              style: AppTextStyles.labelBase.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 6),
            DropdownButtonFormField<Agent>(
              initialValue: _selectedAgent,
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusButton),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusButton),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
              dropdownColor: AppColors.surface,
              hint: Text(
                'None',
                style: AppTextStyles.bodyBase.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
              items: _agents
                  .map(
                    (a) => DropdownMenuItem(
                      value: a,
                      child: Text(
                        a.name,
                        style: AppTextStyles.bodyBase.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (a) => setState(() => _selectedAgent = a),
            ),
            const SizedBox(height: 16),

            // Note
            AppTextField(
              controller: _noteController,
              label: 'Note',
              hint: 'Add a note...',
              maxLines: 2,
            ),
            const SizedBox(height: 24),

            // Submit
            AppButton(
              label: 'Review & Submit',
              isLoading: addState.isSubmitting,
              onPressed:
                  (_selectedClient != null &&
                      _amountPaisa > 0 &&
                      _selectedWalletId != null)
                  ? _showConfirmation
                  : null,
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
