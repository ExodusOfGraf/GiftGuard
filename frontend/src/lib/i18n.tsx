"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getTelegram, hapticImpact } from "./telegram";

export type Locale = "ru" | "en";

export interface Translations {
  // Navigation
  navBrand: string;
  navDashboard: string;
  navCreate: string;
  navHome: string;
  navWebUser: string;

  // Common buttons & labels
  btnSave: string;
  btnCancel: string;
  btnBack: string;
  btnCopy: string;
  btnCopied: string;
  btnLoading: string;
  btnConfirm: string;
  btnDelete: string;
  btnRefresh: string;
  btnOpenMiniApp: string;
  btnShare: string;

  // Home Page
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBtnDashboard: string;
  heroBtnCreate: string;
  featureAntiFarmTitle: string;
  featureAntiFarmDesc: string;
  featureDrawTitle: string;
  featureDrawDesc: string;
  featurePrizeTitle: string;
  featurePrizeDesc: string;
  verifierCardTitle: string;
  verifierCardDesc: string;
  verifierPlaceholder: string;
  verifierBtnSubmit: string;

  // Dashboard
  dashTitle: string;
  dashSubtitle: string;
  dashBtnNew: string;
  dashAuthBannerTitle: string;
  dashAuthBannerText: string;
  dashStatTotal: string;
  dashStatActive: string;
  dashStatDrafts: string;
  dashStatCompleted: string;
  dashStatTotalHint: string;
  dashStatActiveHint: string;
  dashStatDraftsHint: string;
  dashStatCompletedHint: string;
  dashTabAll: string;
  dashTabActive: string;
  dashTabDrafts: string;
  dashTabCompleted: string;
  dashLoading: string;
  dashEmptyTitle: string;
  dashEmptyText: string;
  dashEmptyFilteredText: string;
  dashWinnerCount: string;
  dashWinnersCount: string;
  dashNoPrize: string;
  dashChannelRequired: string;
  dashChannelsRequired: string;
  dashEndsAt: string;
  dashBtnManage: string;
  dashBtnParticipants: string;
  dashBtnResults: string;

  // Create Giveaway Wizard
  createTitle: string;
  createSubtitle: string;
  createSec1Title: string;
  createFieldTitle: string;
  createFieldTitlePlaceholder: string;
  createFieldDesc: string;
  createFieldDescPlaceholder: string;
  createFieldStartsAt: string;
  createFieldEndsAt: string;
  createQuickPresets: string;
  createFieldWinners: string;
  createSec2Title: string;
  createFieldPrizeType: string;
  createTypeTgGift: string;
  createTypeCollectible: string;
  createTypeTonNft: string;
  createTypeCustom: string;
  createFieldPrizeTitle: string;
  createFieldPrizeTitlePlaceholder: string;
  createFieldPrizeValue: string;
  createFieldPrizeCurrency: string;
  createFieldPrizeNotes: string;
  createFieldPrizeNotesPlaceholder: string;
  createSec3Title: string;
  createSec3Desc: string;
  createFieldChannelPlaceholder: string;
  createBtnAddChannel: string;
  createNoChannels: string;
  createBtnRemove: string;
  createSec4Title: string;
  createExcludeHighRiskLabel: string;
  createExcludeHighRiskDesc: string;
  createBtnSubmit: string;
  createBtnSubmitting: string;
  createErrTitle: string;
  createErrPrize: string;

  // Giveaway Detail Page
  gwBackDashboard: string;
  gwBackGiveaway: string;
  gwBadgeOrganizer: string;
  gwBadgeParticipant: string;
  gwStatusLabel: string;
  gwDeadlineLabel: string;
  gwWinnersCountLabel: string;
  gwSectionPrize: string;
  gwSectionPrizeDesc: string;
  gwSectionRequirements: string;
  gwReqDesc: string;
  gwBtnSubscribe: string;
  gwSectionAntiFarm: string;
  gwAntiFarmActive: string;
  gwAntiFarmInactive: string;
  gwSectionAnalytics: string;
  gwStatTotalEntries: string;
  gwStatEligible: string;
  gwStatRejected: string;
  gwStatPending: string;
  gwRiskDistTitle: string;
  gwRiskLow: string;
  gwRiskMedium: string;
  gwRiskHigh: string;
  gwSectionParticipation: string;
  gwYouAreRegistered: string;
  gwYouAreEligible: string;
  gwYouArePending: string;
  gwYouAreRejected: string;
  gwTicketNumber: string;
  gwBtnParticipate: string;
  gwBtnParticipating: string;
  gwOrgControlsTitle: string;
  gwBtnPublish: string;
  gwBtnPublishConfirm: string;
  gwBtnCancelGw: string;
  gwBtnCancelConfirm: string;
  gwBtnExecuteDraw: string;
  gwBtnExecuteDrawConfirm: string;
  gwBtnViewResults: string;
  gwBtnInspectParticipants: string;
  gwPublishedSuccess: string;
  gwParticipatedSuccess: string;

  // Participants Page
  partTitle: string;
  partSubtitle: string;
  partSearchPlaceholder: string;
  partFilterAllEligibility: string;
  partFilterEligible: string;
  partFilterPending: string;
  partFilterRejected: string;
  partFilterAllRisk: string;
  partFilterRiskLow: string;
  partFilterRiskMedium: string;
  partFilterRiskHigh: string;
  partNoFound: string;
  partColUser: string;
  partColJoined: string;
  partColEligibility: string;
  partColRisk: string;
  partColActions: string;
  partBtnInspect: string;

  // Participant Modal / Inspector Sheet
  modalTitle: string;
  modalTgId: string;
  modalTicketUuid: string;
  modalEligibilityTitle: string;
  modalFraudRiskTitle: string;
  modalJoined: string;
  modalSignalsTitle: string;
  modalSignalsDesc: string;
  modalNoSignals: string;
  modalChecksTitle: string;
  modalSubscribed: string;
  modalCheckPending: string;
  modalNotSubscribed: string;

  // Results Page
  resTitle: string;
  resSubtitle: string;
  resPodiumTitle: string;
  resPodiumSubtitle: string;
  resWinnerRank: string;
  resUserTicket: string;
  resVerifyBtn: string;
  resVerifyingBtn: string;
  resStatusValid: string;
  resStatusInvalid: string;
  resChecklistTitle: string;
  resCheckCommitment: string;
  resCheckSnapshot: string;
  resCheckEntropy: string;
  resCheckAlgorithm: string;
  resManifestTitle: string;
  resLabelCommitment: string;
  resLabelSnapshotHash: string;
  resLabelExternalEntropy: string;
  resLabelSecretSeed: string;
  resLabelFinalSeed: string;
  resSnapshotListTitle: string;

  // Status labels
  statusDraft: string;
  statusScheduled: string;
  statusActive: string;
  statusLocked: string;
  statusDrawing: string;
  statusCompleted: string;
  statusCancelled: string;
}

const translations: Record<Locale, Translations> = {
  ru: {
    // Navigation
    navBrand: "GiftGuard",
    navDashboard: "Дашборд",
    navCreate: "+ Создать",
    navHome: "Главная",
    navWebUser: "Веб",

    // Common buttons & labels
    btnSave: "Сохранить",
    btnCancel: "Отмена",
    btnBack: "Назад",
    btnCopy: "Копировать",
    btnCopied: "Скопировано!",
    btnLoading: "Загрузка...",
    btnConfirm: "Подтвердить",
    btnDelete: "Удалить",
    btnRefresh: "Обновить",
    btnOpenMiniApp: "Открыть в Mini App",
    btnShare: "Поделиться",

    // Home Page
    heroBadge: "🛡️ Честные розыгрыши Telegram Gifts & NFT",
    heroTitle: "Защищённые розыгрыши с Provably Fair и защитой от ферм",
    heroSubtitle:
      "Защитите дорогие Telegram Gifts и NFT кампании от ботоферм, гарантируйте прозрачный выбор победителей и анализируйте качество привлечённой аудитории.",
    heroBtnDashboard: "Дашборд организатора →",
    heroBtnCreate: "+ Создать розыгрыш",
    featureAntiFarmTitle: "Защита от ботоферм",
    featureAntiFarmDesc:
      "Поведенческий скоринг оценивает каждого участника (0–100): детекция всплесков регистраций, аномалий скорости и одинаковых поведенческих паттернов.",
    featureDrawTitle: "Provably Fair розыгрыш",
    featureDrawDesc:
      "Криптографический протокол обязательств (SHA-256, замороженный снапшот участников, HMAC-SHA256 rejection sampling). Любой может математически перепроверить итог.",
    featurePrizeTitle: "Прозрачность призов",
    featurePrizeDesc:
      "Поддержка Telegram Gifts, Collectibles и TON NFT. Точные метаданные, оценка стоимости и публичный манифест вручения приза.",
    verifierCardTitle: "Публичная проверка любого розыгрыша",
    verifierCardDesc:
      "Введите UUID розыгрыша, чтобы изучить криптографический манифест, хэш снапшота участников и независимый алгоритмический отбор победителей.",
    verifierPlaceholder: "например: 8f31d044-8848-43f9-...",
    verifierBtnSubmit: "Проверить честность →",

    // Dashboard
    dashTitle: "Дашборд кампаний",
    dashSubtitle: "Управление розыгрышами Telegram Gifts & NFT",
    dashBtnNew: "+ Новый розыгрыш",
    dashAuthBannerTitle: "Требуется авторизация Telegram",
    dashAuthBannerText:
      "Откройте GiftGuard внутри Telegram Mini App, чтобы управлять кампаниями от имени вашего Telegram-аккаунта.",
    dashStatTotal: "Всего кампаний",
    dashStatActive: "Активные",
    dashStatDrafts: "Черновики",
    dashStatCompleted: "Завершены",
    dashStatTotalHint: "За всё время",
    dashStatActiveHint: "Приём заявок открыт",
    dashStatDraftsHint: "Не опубликованы",
    dashStatCompletedHint: "С Provably Fair доказательством",
    dashTabAll: "Все",
    dashTabActive: "Активные",
    dashTabDrafts: "Черновики",
    dashTabCompleted: "Завершённые",
    dashLoading: "Загрузка розыгрышей...",
    dashEmptyTitle: "Розыгрыши не найдены",
    dashEmptyText: "У вас пока нет созданных розыгрышей.",
    dashEmptyFilteredText: "Нет розыгрышей в категории",
    dashWinnerCount: "победитель",
    dashWinnersCount: "победителей",
    dashNoPrize: "Приз не указан",
    dashChannelRequired: "канал обязателен",
    dashChannelsRequired: "канала(ов) обязательно",
    dashEndsAt: "Окончание",
    dashBtnManage: "Управление",
    dashBtnParticipants: "Участники",
    dashBtnResults: "Итоги",

    // Create Giveaway Wizard
    createTitle: "Новый розыгрыш",
    createSubtitle: "Настройте параметры, приз, каналы для подписки и защиту от накруток.",
    createSec1Title: "1. Параметры кампании",
    createFieldTitle: "Название розыгрыша *",
    createFieldTitlePlaceholder: "например: Plush Pepe NFT Giveaway #42",
    createFieldDesc: "Описание и правила",
    createFieldDescPlaceholder: "Расскажите подробности розыгрыша для участников...",
    createFieldStartsAt: "Дата начала (UTC) *",
    createFieldEndsAt: "Дедлайн (UTC) *",
    createQuickPresets: "Быстрый срок:",
    createFieldWinners: "Количество победителей (1 – 100) *",
    createSec2Title: "2. Информация о призе",
    createFieldPrizeType: "Тип приза *",
    createTypeTgGift: "Telegram Gift (Подарок)",
    createTypeCollectible: "Collectible Gift (Коллекционный)",
    createTypeTonNft: "TON NFT",
    createTypeCustom: "Свой приз",
    createFieldPrizeTitle: "Название приза *",
    createFieldPrizeTitlePlaceholder: "например: Plush Pepe #7421",
    createFieldPrizeValue: "Ориентировочная стоимость",
    createFieldPrizeCurrency: "Валюта",
    createFieldPrizeNotes: "Примечание к призу",
    createFieldPrizeNotesPlaceholder: "Детали передачи или атрибуты NFT",
    createSec3Title: "3. Обязательные каналы для подписки",
    createSec3Desc:
      "Укажите каналы, на которые участники должны подписаться. Бот должен быть администратором в этих каналах для проверки подписки.",
    createFieldChannelPlaceholder: "@channel_username или -100...",
    createBtnAddChannel: "+ Добавить",
    createNoChannels: "Каналы не добавлены. (Участвовать смогут любые пользователи без подписки)",
    createBtnRemove: "Удалить",
    createSec4Title: "4. Правила защиты от ботоферм (Anti-Farm)",
    createExcludeHighRiskLabel: "Исключать High-Risk участников из выбора победителей",
    createExcludeHighRiskDesc:
      "Аккаунты с оценкой риска ≥ 60 (волны мгновенных регистраций, подозрительная скорость, дубликаты) будут автоматически исключены из пула победителей.",
    createBtnSubmit: "Создать черновик розыгрыша →",
    createBtnSubmitting: "Создание...",
    createErrTitle: "Укажите название розыгрыша",
    createErrPrize: "Укажите название приза",

    // Giveaway Detail Page
    gwBackDashboard: "← В дашборд",
    gwBackGiveaway: "← К розыгрышу",
    gwBadgeOrganizer: "Организатор",
    gwBadgeParticipant: "Участник",
    gwStatusLabel: "Статус",
    gwDeadlineLabel: "Дедлайн",
    gwWinnersCountLabel: "Победителей",
    gwSectionPrize: "Приз розыгрыша",
    gwSectionPrizeDesc: "Описание приза",
    gwSectionRequirements: "Условия участия (Каналы)",
    gwReqDesc: "Для допуска к розыгрышу необходимо подписаться на следующие каналы:",
    gwBtnSubscribe: "📢 Подписаться на",
    gwSectionAntiFarm: "Защита Anti-Farm",
    gwAntiFarmActive: "Исключение High-Risk (Score ≥ 60) включено ✓",
    gwAntiFarmInactive: "Допускаются все участники без исключения",
    gwSectionAnalytics: "Аналитика аудитории",
    gwStatTotalEntries: "Всего заявок",
    gwStatEligible: "Допущено (Eligible)",
    gwStatRejected: "Отклонено",
    gwStatPending: "Ожидают проверки",
    gwRiskDistTitle: "Распределение риска (Anti-Farm):",
    gwRiskLow: "Низкий риск (Low):",
    gwRiskMedium: "Средний риск (Medium):",
    gwRiskHigh: "Высокий риск (High):",
    gwSectionParticipation: "Ваше участие",
    gwYouAreRegistered: "Вы зарегистрированы в розыгрыше! 🎉",
    gwYouAreEligible: "Все условия выполнены! Вы участвуете в честном розыгрыше приза.",
    gwYouArePending: "Проверка подписки в процессе. Мы обновим статус автоматически.",
    gwYouAreRejected: "Условия подписки не выполнены. Подпишитесь на каналы и проверьте снова.",
    gwTicketNumber: "Ваш номер билета (UUID):",
    gwBtnParticipate: "🎁 Участвовать в розыгрыше",
    gwBtnParticipating: "Регистрация...",
    gwOrgControlsTitle: "Управление розыгрышем",
    gwBtnPublish: "🚀 Опубликовать розыгрыш",
    gwBtnPublishConfirm: "Опубликовать розыгрыш? Условия и приз будут зафиксированы криптографически.",
    gwBtnCancelGw: "❌ Отменить розыгрыш",
    gwBtnCancelConfirm: "Вы уверены, что хотите отменить этот розыгрыш? Действие необратимо.",
    gwBtnExecuteDraw: "🎲 Провести Provably Fair розыгрыш",
    gwBtnExecuteDrawConfirm: "Провести детерминированный выбор победителей прямо сейчас?",
    gwBtnViewResults: "🏆 Посмотреть итоги и верификацию",
    gwBtnInspectParticipants: "👥 Инспектор участников и антифрод",
    gwPublishedSuccess: "Розыгрыш успешно опубликован!",
    gwParticipatedSuccess: "Вы успешно зарегистрированы в розыгрыше! 🎉",

    // Participants Page
    partTitle: "Инспектор участников",
    partSubtitle: "Анализ поведенческого риска, аномалий регистраций и проверки каналов.",
    partSearchPlaceholder: "Поиск по @username, имени или ID...",
    partFilterAllEligibility: "Все статусы допуска",
    partFilterEligible: "Допущенные (Eligible)",
    partFilterPending: "Ожидают проверки (Pending)",
    partFilterRejected: "Отклоненные (Rejected)",
    partFilterAllRisk: "Все уровни риска",
    partFilterRiskLow: "Низкий (Low)",
    partFilterRiskMedium: "Средний (Medium)",
    partFilterRiskHigh: "Высокий (High)",
    partNoFound: "Участники не найдены по заданным фильтрам.",
    partColUser: "Пользователь",
    partColJoined: "Дата входа",
    partColEligibility: "Допуск",
    partColRisk: "Оценка риска",
    partColActions: "Действия",
    partBtnInspect: "Сигналы",

    // Participant Modal / Inspector Sheet
    modalTitle: "Анализ участника",
    modalTgId: "Telegram ID:",
    modalTicketUuid: "Номер билета (UUID)",
    modalEligibilityTitle: "Статус допуска",
    modalFraudRiskTitle: "Риск фермы",
    modalJoined: "Регистрация:",
    modalSignalsTitle: "Сигналы антифрода",
    modalSignalsDesc: "Эвристические правила, сработавшие для данного профиля.",
    modalNoSignals: "✓ Подозрительных сигналов не обнаружено. Профиль чистый.",
    modalChecksTitle: "Проверки подписок на каналы",
    modalSubscribed: "Подписан ✓",
    modalCheckPending: "Проверка ожидает ⏳",
    modalNotSubscribed: "Не подписан ✗",

    // Results Page
    resTitle: "Итоги Provably Fair",
    resSubtitle: "Публичный криптографический манифест математически честного выбора победителей.",
    resPodiumTitle: "Победители розыгрыша",
    resPodiumSubtitle: "Определены детерминированным алгоритмом HMAC-SHA256 Rejection Sampling.",
    resWinnerRank: "Место #",
    resUserTicket: "Билет:",
    resVerifyBtn: "🔍 Независимая проверка сервером",
    resVerifyingBtn: "Выполняется проверка...",
    resStatusValid: "✓ КРИПТОГРАФИЧЕСКИ ПОДТВЕРЖДЕНО: РОЗЫГРЫШ ЧЕСТЕН",
    resStatusInvalid: "✗ ОШИБКА: НЕСООТВЕТСТВИЕ КРИПТОГРАФИЧЕСКИХ ДАННЫХ",
    resChecklistTitle: "Чек-лист криптографической честности:",
    resCheckCommitment: "Обязательство seed зафиксировано до начала розыгрыша",
    resCheckSnapshot: "Снэпшот участников отсортирован и защищён SHA-256 хэшем",
    resCheckEntropy: "Внешняя энтропия учтена при генерации финального seed",
    resCheckAlgorithm: "Победители отобраны алгоритмом giftguard-v1 без повторов",
    resManifestTitle: "Криптографический манифест",
    resLabelCommitment: "Commitment Hash (SHA-256)",
    resLabelSnapshotHash: "Participant Snapshot Hash (SHA-256)",
    resLabelExternalEntropy: "Внешняя энтропия (External Entropy)",
    resLabelSecretSeed: "Раскрытый секретный seed (Secret Seed)",
    resLabelFinalSeed: "Финальный seed (HMAC-SHA256)",
    resSnapshotListTitle: "Канонический снэпшот участников:",

    // Status labels
    statusDraft: "Черновик",
    statusScheduled: "Запланирован",
    statusActive: "Активен",
    statusLocked: "Приём закрыт",
    statusDrawing: "Проводится розыгрыш...",
    statusCompleted: "Завершён",
    statusCancelled: "Отменён",
  },

  en: {
    // Navigation
    navBrand: "GiftGuard",
    navDashboard: "Dashboard",
    navCreate: "+ Create",
    navHome: "Home",
    navWebUser: "Web",

    // Common buttons & labels
    btnSave: "Save",
    btnCancel: "Cancel",
    btnBack: "Back",
    btnCopy: "Copy",
    btnCopied: "Copied!",
    btnLoading: "Loading...",
    btnConfirm: "Confirm",
    btnDelete: "Delete",
    btnRefresh: "Refresh",
    btnOpenMiniApp: "Open in Mini App",
    btnShare: "Share",

    // Home Page
    heroBadge: "🛡️ Provably Fair Telegram Gifts & NFT",
    heroTitle: "Verifiable Telegram Gifts & NFT Giveaways",
    heroSubtitle:
      "Protect valuable gift campaigns from multi-account bot farms, ensure provably fair winner selection, and analyze real subscriber quality.",
    heroBtnDashboard: "Organizer Dashboard →",
    heroBtnCreate: "+ Create Giveaway",
    featureAntiFarmTitle: "Anti-Farm Protection",
    featureAntiFarmDesc:
      "Explainable heuristic engine evaluates each participant (0–100): detects registration bursts, speed anomalies, and duplicate behavioral patterns.",
    featureDrawTitle: "Provably Fair Draw",
    featureDrawDesc:
      "Cryptographic commitment-reveal protocol (SHA-256, frozen participant snapshot, HMAC-SHA256 rejection sampling). Anyone can mathematically verify the result.",
    featurePrizeTitle: "Prize Transparency",
    featurePrizeDesc:
      "Verifiable metadata for Telegram Gifts, Collectibles, and TON NFTs. Clear value valuation and public fulfillment manifest.",
    verifierCardTitle: "Verify Any Giveaway Result",
    verifierCardDesc:
      "Enter a Giveaway UUID to inspect its cryptographic manifest, participant snapshot hash, and deterministic winner selection.",
    verifierPlaceholder: "e.g. 8f31d044-8848-43f9-...",
    verifierBtnSubmit: "Verify Draw →",

    // Dashboard
    dashTitle: "Campaigns Dashboard",
    dashSubtitle: "Manage your Telegram Gift & NFT giveaways",
    dashBtnNew: "+ New Giveaway",
    dashAuthBannerTitle: "Telegram Authentication Required",
    dashAuthBannerText:
      "Open GiftGuard inside the Telegram Mini App to manage campaigns with your Telegram account.",
    dashStatTotal: "Total Campaigns",
    dashStatActive: "Active Now",
    dashStatDrafts: "Drafts",
    dashStatCompleted: "Completed",
    dashStatTotalHint: "All time created",
    dashStatActiveHint: "Accepting entries",
    dashStatDraftsHint: "Unpublished",
    dashStatCompletedHint: "With provable draw",
    dashTabAll: "All",
    dashTabActive: "Active",
    dashTabDrafts: "Drafts",
    dashTabCompleted: "Completed",
    dashLoading: "Loading your giveaways...",
    dashEmptyTitle: "No giveaways found",
    dashEmptyText: "You haven't created any giveaways yet.",
    dashEmptyFilteredText: "No giveaways matching the filter",
    dashWinnerCount: "winner",
    dashWinnersCount: "winners",
    dashNoPrize: "No prize configured",
    dashChannelRequired: "channel required",
    dashChannelsRequired: "channels required",
    dashEndsAt: "Ends",
    dashBtnManage: "Manage",
    dashBtnParticipants: "Participants",
    dashBtnResults: "Results",

    // Create Giveaway Wizard
    createTitle: "Create Giveaway",
    createSubtitle: "Configure terms, prize metadata, required channels, and anti-fraud rules.",
    createSec1Title: "1. Campaign Details",
    createFieldTitle: "Giveaway Title *",
    createFieldTitlePlaceholder: "e.g. Plush Pepe NFT Giveaway #42",
    createFieldDesc: "Description & Rules",
    createFieldDescPlaceholder: "Explain terms and details for participants...",
    createFieldStartsAt: "Starts At (UTC) *",
    createFieldEndsAt: "Ends At (UTC) *",
    createQuickPresets: "Quick presets:",
    createFieldWinners: "Winners Count (1 – 100) *",
    createSec2Title: "2. Prize Information",
    createFieldPrizeType: "Prize Type *",
    createTypeTgGift: "Telegram Gift",
    createTypeCollectible: "Telegram Collectible",
    createTypeTonNft: "TON NFT",
    createTypeCustom: "Custom Prize",
    createFieldPrizeTitle: "Prize Title *",
    createFieldPrizeTitlePlaceholder: "e.g. Plush Pepe #7421",
    createFieldPrizeValue: "Estimated Value",
    createFieldPrizeCurrency: "Currency",
    createFieldPrizeNotes: "Prize Notes",
    createFieldPrizeNotesPlaceholder: "Delivery notes or collectible attributes",
    createSec3Title: "3. Channel Subscription Requirements",
    createSec3Desc:
      "Add channels users must join to qualify. The bot must be an administrator in these channels to check membership.",
    createFieldChannelPlaceholder: "@channel_username or -100...",
    createBtnAddChannel: "+ Add",
    createNoChannels: "No channels added yet. (Anyone can participate without subscription requirements)",
    createBtnRemove: "Remove",
    createSec4Title: "4. Anti-Fraud & Fairness Rules",
    createExcludeHighRiskLabel: "Exclude HIGH-Risk Participants from Winning Pool",
    createExcludeHighRiskDesc:
      "Accounts scoring ≥60 in Anti-Farm evaluation (burst registrations, speed anomalies, duplicate behavioral clusters) will not be eligible to win.",
    createBtnSubmit: "Create Draft Giveaway →",
    createBtnSubmitting: "Creating...",
    createErrTitle: "Please enter a giveaway title",
    createErrPrize: "Please specify a prize title",

    // Giveaway Detail Page
    gwBackDashboard: "← Back to Dashboard",
    gwBackGiveaway: "← Back to Giveaway",
    gwBadgeOrganizer: "Organizer",
    gwBadgeParticipant: "Participant",
    gwStatusLabel: "Status",
    gwDeadlineLabel: "Deadline",
    gwWinnersCountLabel: "Winners",
    gwSectionPrize: "Giveaway Prize",
    gwSectionPrizeDesc: "Prize Description",
    gwSectionRequirements: "Entry Requirements (Channels)",
    gwReqDesc: "Subscribe to the following channels to be eligible:",
    gwBtnSubscribe: "📢 Subscribe to",
    gwSectionAntiFarm: "Anti-Farm Protection",
    gwAntiFarmActive: "Exclude High-Risk (Score ≥ 60) is Enabled ✓",
    gwAntiFarmInactive: "All participants allowed without exclusion",
    gwSectionAnalytics: "Audience Analytics",
    gwStatTotalEntries: "Total Entries",
    gwStatEligible: "Eligible Entries",
    gwStatRejected: "Rejected Entries",
    gwStatPending: "Pending Verification",
    gwRiskDistTitle: "Anti-Farm Risk Breakdown:",
    gwRiskLow: "Low Risk:",
    gwRiskMedium: "Medium Risk:",
    gwRiskHigh: "High Risk:",
    gwSectionParticipation: "Your Entry",
    gwYouAreRegistered: "You are registered in this giveaway! 🎉",
    gwYouAreEligible: "All terms fulfilled! You are participating in the fair draw.",
    gwYouArePending: "Channel membership check in progress. Status will update automatically.",
    gwYouAreRejected: "Channel requirements not met. Please subscribe and check again.",
    gwTicketNumber: "Your Ticket UUID:",
    gwBtnParticipate: "🎁 Enter Giveaway",
    gwBtnParticipating: "Registering...",
    gwOrgControlsTitle: "Organizer Controls",
    gwBtnPublish: "🚀 Publish Giveaway",
    gwBtnPublishConfirm: "Publish this giveaway? Terms and prize will become immutable.",
    gwBtnCancelGw: "❌ Cancel Giveaway",
    gwBtnCancelConfirm: "Are you sure you want to cancel? This action cannot be undone.",
    gwBtnExecuteDraw: "🎲 Execute Provably Fair Draw",
    gwBtnExecuteDrawConfirm: "Execute the deterministic draw now?",
    gwBtnViewResults: "🏆 View Results & Verification",
    gwBtnInspectParticipants: "👥 Inspect Participants & Anti-Farm",
    gwPublishedSuccess: "Giveaway published successfully!",
    gwParticipatedSuccess: "You are now registered in this giveaway! 🎉",

    // Participants Page
    partTitle: "Anti-Farm Inspector",
    partSubtitle: "Inspect behavioral risk scoring, burst anomalies, and requirement checks.",
    partSearchPlaceholder: "Search by @username, name, or Telegram ID...",
    partFilterAllEligibility: "All Eligibility Statuses",
    partFilterEligible: "Eligible Only",
    partFilterPending: "Pending Checks",
    partFilterRejected: "Rejected Only",
    partFilterAllRisk: "All Risk Levels",
    partFilterRiskLow: "Low Risk",
    partFilterRiskMedium: "Medium Risk",
    partFilterRiskHigh: "High Risk",
    partNoFound: "No participants matching the selected filters.",
    partColUser: "User",
    partColJoined: "Joined",
    partColEligibility: "Eligibility",
    partColRisk: "Risk Score",
    partColActions: "Actions",
    partBtnInspect: "Signals",

    // Participant Modal / Inspector Sheet
    modalTitle: "Participant Details",
    modalTgId: "Telegram ID:",
    modalTicketUuid: "Ticket UUID",
    modalEligibilityTitle: "Eligibility Status",
    modalFraudRiskTitle: "Farm Risk",
    modalJoined: "Joined:",
    modalSignalsTitle: "Anti-Farm Signals",
    modalSignalsDesc: "Explainable heuristic rules evaluated for this profile.",
    modalNoSignals: "✓ No suspicious signals detected. Profile looks clean.",
    modalChecksTitle: "Channel Subscription Checks",
    modalSubscribed: "Subscribed ✓",
    modalCheckPending: "Check Pending ⏳",
    modalNotSubscribed: "Not Subscribed ✗",

    // Results Page
    resTitle: "Provably Fair Results",
    resSubtitle: "Public cryptographic verification manifest for mathematical winner selection.",
    resPodiumTitle: "Giveaway Winners",
    resPodiumSubtitle: "Selected via deterministic HMAC-SHA256 Rejection Sampling.",
    resWinnerRank: "Rank #",
    resUserTicket: "Ticket:",
    resVerifyBtn: "🔍 Independent Server Verification",
    resVerifyingBtn: "Verifying...",
    resStatusValid: "✓ CRYPTOGRAPHICALLY VALID: DRAW IS PROVABLY FAIR",
    resStatusInvalid: "✗ TAMPER DETECTED: CRYPTOGRAPHIC INTEGRITY CHECK FAILED",
    resChecklistTitle: "Fairness Verification Checklist:",
    resCheckCommitment: "Seed commitment published prior to giveaway draw",
    resCheckSnapshot: "Participant snapshot frozen and protected by SHA-256 hash",
    resCheckEntropy: "External entropy integrated into final seed derivation",
    resCheckAlgorithm: "Winners selected via giftguard-v1 algorithm without duplicates",
    resManifestTitle: "Cryptographic Manifest",
    resLabelCommitment: "Commitment Hash (SHA-256)",
    resLabelSnapshotHash: "Participant Snapshot Hash (SHA-256)",
    resLabelExternalEntropy: "External Entropy",
    resLabelSecretSeed: "Revealed Secret Seed",
    resLabelFinalSeed: "Final Seed (HMAC-SHA256)",
    resSnapshotListTitle: "Canonical Participant Snapshot:",

    // Status labels
    statusDraft: "Draft",
    statusScheduled: "Scheduled",
    statusActive: "Active",
    statusLocked: "Locked",
    statusDrawing: "Drawing...",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType>({
  locale: "ru",
  setLocale: () => {},
  t: translations.ru,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    // 1. Check saved language in localStorage
    try {
      const saved = localStorage.getItem("giftguard_locale") as Locale | null;
      if (saved === "ru" || saved === "en") {
        setLocaleState(saved);
        return;
      }
    } catch {
      // Ignore localStorage errors
    }

    // 2. Check Telegram language
    const tg = getTelegram();
    const tgLang = tg?.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      if (tgLang.toLowerCase().startsWith("ru")) {
        setLocaleState("ru");
        return;
      }
      setLocaleState("en");
      return;
    }

    // 3. Fallback to browser language
    if (typeof navigator !== "undefined" && navigator.language) {
      if (navigator.language.toLowerCase().startsWith("ru")) {
        setLocaleState("ru");
        return;
      }
    }

    setLocaleState("ru"); // Default to Russian
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    hapticImpact("light");
    try {
      localStorage.setItem("giftguard_locale", newLocale);
    } catch {
      // Ignore
    }
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
