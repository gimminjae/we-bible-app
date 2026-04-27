import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ChurchInfoSheet } from '@/components/churches/church-info-sheet';
import {
  ChurchPrayerSheet,
  type ChurchPrayerAudienceOption,
} from '@/components/churches/church-prayer-sheet';
import { ChurchRoleBadge } from '@/components/churches/role-badge';
import { Button, ButtonText } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SelectionSheet, type SelectionOption } from '@/components/ui/selection-sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useChurchActions, useChurchDetail } from '@/hooks/use-churches';
import { useLoading } from '@/hooks/use-loading';
import { useResponsive } from '@/hooks/use-responsive';
import { formatShortDateTime } from '@/lib/date';
import { buildPrayerLabel } from '@/lib/prayer';
import type { ChurchPrayer } from '@/lib/church';
import { useI18n } from '@/utils/i18n';

type DetailTab = 'members' | 'plans' | 'prayers' | 'teams';
type PickerState =
  | {
      kind: 'request' | 'member' | 'leader';
      key: string;
      title: string;
      options: SelectionOption[];
      value: string;
    }
  | null;

function getChurchActionErrorMessage(
  error: unknown,
  translate: (key: string) => string,
  fallbackKey: string,
) {
  if (error instanceof Error) {
    if (error.message === 'CHURCH_HAS_OTHER_MEMBERS') {
      return translate('church.deleteRequiresNoOtherMembers');
    }

    return error.message;
  }

  return translate(fallbackKey);
}

type ActionTextButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  action?: 'primary' | 'secondary' | 'positive' | 'negative';
  variant?: 'solid' | 'outline' | 'link';
  className?: string;
  textClassName?: string;
};

function ActionTextButton({
  label,
  onPress,
  disabled = false,
  action = 'primary',
  variant = 'solid',
  className = '',
  textClassName = '',
}: ActionTextButtonProps) {
  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      action={action}
      variant={variant}
      className={`h-auto ${className}`.trim()}
    >
      <ButtonText className={textClassName}>{label}</ButtonText>
    </Button>
  );
}

function getPrayerCellText(value: string) {
  return value.trim() || '-';
}

function getPrayerCreatedSortKey(prayer: ChurchPrayer) {
  return prayer.createdAt || '';
}

const CHURCH_PRAYER_COLUMN_WIDTHS = {
  requester: 96,
  relation: 84,
  target: 96,
  latestContent: 220,
  updatedAt: 116,
  createdAt: 116,
} as const

export default function ChurchDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const churchId = params.id ?? '';
  const router = useRouter();
  const { t } = useI18n();
  const { widePageMaxWidth } = useResponsive();
  const { showToast } = useToast();
  const { dataUserId } = useAuth();
  const { churchDetail, isLoading, error } = useChurchDetail(churchId);
  const {
    approveJoinRequest,
    rejectJoinRequest,
    updateMemberRole,
    transferSuperAdmin,
    updateMemberTeam,
    updateTeamLeader,
    removeMember,
    leaveChurch,
    deleteChurch,
    updateChurchInfo,
    createTeam,
    createChurchPrayer,
    updateChurchPrayer,
    deleteChurchPrayer,
    addChurchPrayerContent,
    deleteChurchPrayerContent,
  } = useChurchActions();
  const [activeTab, setActiveTab] = useState<DetailTab>('members');
  const [creatingTeamName, setCreatingTeamName] = useState('');
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [selectedRequestTeamIds, setSelectedRequestTeamIds] = useState<Record<string, string>>({});
  const [selectedMemberTeamIds, setSelectedMemberTeamIds] = useState<Record<string, string>>({});
  const [selectedTeamLeaderIds, setSelectedTeamLeaderIds] = useState<Record<string, string>>({});
  const [expandedPrayerId, setExpandedPrayerId] = useState<string | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<ChurchPrayer | null>(null);
  const [pickerState, setPickerState] = useState<PickerState>(null);
  const [createPrayerVisible, setCreatePrayerVisible] = useState(false);
  const [editPrayerVisible, setEditPrayerVisible] = useState(false);
  const [appendPrayerVisible, setAppendPrayerVisible] = useState(false);
  const [editChurchInfoVisible, setEditChurchInfoVisible] = useState(false);
  const createPrayerLoading = useLoading();
  const editPrayerLoading = useLoading();
  const appendPrayerLoading = useLoading();

  const churchWidePrayers = useMemo(
    () => churchDetail?.prayers.filter((prayer) => prayer.teamId == null) ?? [],
    [churchDetail],
  );

  const teamPrayerGroups = useMemo(() => {
    if (!churchDetail) return [];
    const groups = new Map<string, { teamId: string; teamName: string; prayers: ChurchPrayer[] }>();

    for (const prayer of churchDetail.prayers) {
      if (!prayer.teamId || !prayer.teamName) continue;
      const existing = groups.get(prayer.teamId);
      if (existing) existing.prayers.push(prayer);
      else {
        groups.set(prayer.teamId, {
          teamId: prayer.teamId,
          teamName: prayer.teamName,
          prayers: [prayer],
        });
      }
    }

    return [...groups.values()].sort((left, right) => left.teamName.localeCompare(right.teamName, 'ko'));
  }, [churchDetail]);

  const prayerAudienceOptions = useMemo<ChurchPrayerAudienceOption[]>(() => {
    if (!churchDetail?.church.myRole) return [];

    const options: ChurchPrayerAudienceOption[] = [
      { value: '', label: t('church.churchPrayerAudienceOption') },
    ];

    if (churchDetail.church.isSuperAdmin || churchDetail.church.isDeputyAdmin) {
      return [
        ...options,
        ...churchDetail.teams.map((team) => ({
          value: team.id,
          label: t('church.teamPrayerAudienceOption').replace('{team}', team.name),
        })),
      ];
    }

    if (churchDetail.church.myTeamId && churchDetail.church.myTeamName) {
      return [
        ...options,
        {
          value: churchDetail.church.myTeamId,
          label: t('church.teamPrayerAudienceOption').replace('{team}', churchDetail.church.myTeamName),
        },
      ];
    }

    return options;
  }, [churchDetail, t]);
  const hasOtherMembers = useMemo(
    () => churchDetail?.members.some((member) => member.userId !== dataUserId) ?? false,
    [churchDetail, dataUserId],
  );
  const canDeleteChurch = churchDetail?.church.isSuperAdmin && !hasOtherMembers;

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading || !churchDetail) {
    return <LoadingScreen message="Loading church..." />;
  }

  const confirmDestructive = (message: string, action: () => void | Promise<void>) => {
    Alert.alert('', message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          void action();
        },
      },
    ]);
  };

  const handlePickerSelect = (value: string) => {
    if (!pickerState) return;
    if (pickerState.kind === 'request') {
      setSelectedRequestTeamIds((previous) => ({ ...previous, [pickerState.key]: value }));
      return;
    }
    if (pickerState.kind === 'member') {
      setSelectedMemberTeamIds((previous) => ({ ...previous, [pickerState.key]: value }));
      return;
    }
    setSelectedTeamLeaderIds((previous) => ({ ...previous, [pickerState.key]: value }));
  };

  const openRequestTeamPicker = (requestId: string) => {
    setPickerState({
      kind: 'request',
      key: requestId,
      title: t('church.noTeam'),
      value: selectedRequestTeamIds[requestId] ?? '',
      options: [
        { value: '', label: t('church.noTeam') },
        ...churchDetail.teams.map((team) => ({ value: team.id, label: team.name })),
      ],
    });
  };

  const openMemberTeamPicker = (userId: string, currentValue: string) => {
    setPickerState({
      kind: 'member',
      key: userId,
      title: t('church.saveTeamAssignment'),
      value: currentValue,
      options: [
        { value: '', label: t('church.noTeam') },
        ...churchDetail.teams.map((team) => ({ value: team.id, label: team.name })),
      ],
    });
  };

  const openLeaderPicker = (teamId: string, currentValue: string) => {
    const teamMembers = churchDetail.members.filter((member) => member.teamId === teamId);
    setPickerState({
      kind: 'leader',
      key: teamId,
      title: t('church.saveLeader'),
      value: currentValue,
      options: [
        { value: '', label: t('church.noLeader') },
        ...teamMembers.map((member) => ({
          value: member.userId,
          label: member.profile.displayName,
        })),
      ],
    });
  };

  const renderPrayerDetail = (prayer: ChurchPrayer) => {
    return (
      <View className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {buildPrayerLabel(prayer.requester, prayer.target, t)}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {prayer.teamName
                ? t('church.teamPrayerScopeShort').replace('{team}', prayer.teamName)
                : t('church.churchPrayerScopeShort')}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('church.prayerCreatedBy').replace('{name}', prayer.createdByName)}
            </Text>
            {prayer.relation ? (
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('prayerDrawer.relationLabel')}: {prayer.relation}
              </Text>
            ) : null}
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatShortDateTime(prayer.updatedAt)}
            </Text>
          </View>
          <View className="rounded-2xl bg-primary-100 px-3 py-2 dark:bg-primary-950/40">
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {t('church.prayerContentCount').replace('{count}', String(prayer.contentCount))}
            </Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
          <Text className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
            {t('church.prayerTableLatestContent')}
          </Text>
          <Text className="text-sm leading-6 text-gray-700 dark:text-gray-200">
            {prayer.latestContent || t('church.noPrayerContents')}
          </Text>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <ActionTextButton
            onPress={() => {
              setSelectedPrayer(prayer);
              setAppendPrayerVisible(true);
            }}
            label={t('church.addPrayerContent')}
            className="rounded-2xl bg-primary-500 px-4 py-3"
            textClassName="font-semibold text-white"
          />
          {prayer.canManagePrayer ? (
            <>
              <ActionTextButton
                onPress={() => {
                  setSelectedPrayer(prayer);
                  setEditPrayerVisible(true);
                }}
                label={t('church.editPrayer')}
                action="secondary"
                variant="outline"
                className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                textClassName="font-semibold text-gray-900 dark:text-white"
              />
              <ActionTextButton
                onPress={() =>
                  confirmDestructive(t('church.deletePrayerConfirm'), async () => {
                    setProcessingKey(`delete-prayer-${prayer.id}`);
                    try {
                      await deleteChurchPrayer({
                        churchId: churchDetail.church.id,
                        prayerId: prayer.id,
                      });
                      if (expandedPrayerId === prayer.id) {
                        setExpandedPrayerId(null);
                      }
                      if (selectedPrayer?.id === prayer.id) {
                        setSelectedPrayer(null);
                      }
                      showToast(t('toast.churchPrayerDeleted'));
                    } catch (prayerError) {
                      showToast(
                        prayerError instanceof Error
                          ? prayerError.message
                          : t('church.prayerDeleteFailed'),
                      );
                    } finally {
                      setProcessingKey(null);
                    }
                  })
                }
                disabled={processingKey === `delete-prayer-${prayer.id}`}
                label={t('church.deletePrayer')}
                action="negative"
                variant="outline"
                className="rounded-2xl border-red-200 px-4 py-3 dark:border-red-900"
                textClassName="font-semibold text-red-500"
              />
            </>
          ) : null}
        </View>

        <View className="mt-5">
          <Text className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {t('church.prayerContents')}
          </Text>
          {prayer.contents.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 dark:border-gray-800">
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('church.noPrayerContents')}
              </Text>
            </View>
          ) : (
            prayer.contents.map((content) => (
              <View
                key={content.id}
                className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                      {content.content}
                    </Text>
                    <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      {content.createdByName} · {formatShortDateTime(content.registeredAt)}
                    </Text>
                  </View>
                  {content.canManage ? (
                    <ActionTextButton
                      onPress={() =>
                        confirmDestructive(t('church.deletePrayerContentConfirm'), async () => {
                          setProcessingKey(`delete-prayer-content-${content.id}`);
                          try {
                            await deleteChurchPrayerContent({
                              churchId: churchDetail.church.id,
                              contentId: content.id,
                            });
                            showToast(t('toast.churchPrayerContentDeleted'));
                          } catch (contentError) {
                            showToast(
                              contentError instanceof Error
                                ? contentError.message
                                : t('church.prayerContentDeleteFailed'),
                            );
                          } finally {
                            setProcessingKey(null);
                          }
                        })
                      }
                      disabled={processingKey === `delete-prayer-content-${content.id}`}
                      label={t('mypage.deleteConfirm')}
                      action="negative"
                      variant="outline"
                      className="rounded-2xl border-red-200 px-3 py-2 dark:border-red-900"
                      textClassName="text-sm font-semibold text-red-500"
                    />
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  const renderPrayerTable = (prayers: ChurchPrayer[]) => {
    const sortedPrayers = [...prayers].sort((left, right) => {
      const createdDiff = getPrayerCreatedSortKey(right).localeCompare(getPrayerCreatedSortKey(left));
      if (createdDiff !== 0) return createdDiff;
      return right.updatedAt.localeCompare(left.updatedAt);
    });
    const expandedPrayer = sortedPrayers.find((prayer) => prayer.id === expandedPrayerId) ?? null;
    const tableMinWidth =
      CHURCH_PRAYER_COLUMN_WIDTHS.requester +
      CHURCH_PRAYER_COLUMN_WIDTHS.relation +
      CHURCH_PRAYER_COLUMN_WIDTHS.target +
      CHURCH_PRAYER_COLUMN_WIDTHS.latestContent +
      CHURCH_PRAYER_COLUMN_WIDTHS.updatedAt +
      CHURCH_PRAYER_COLUMN_WIDTHS.createdAt

    return (
      <>
        <Table minWidth={tableMinWidth}>
          <TableHeader>
            <TableHead
              className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
              textClassName="text-center"
              style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.requester }}
            >
              {t('mypage.prayerRequester')}
            </TableHead>
            <TableHead
              className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
              textClassName="text-center"
              style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.relation }}
            >
              {t('prayerDrawer.relationLabel')}
            </TableHead>
            <TableHead
              className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
              textClassName="text-center"
              style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.target }}
            >
              {t('mypage.prayerTarget')}
            </TableHead>
            <TableHead
              className="items-start border-r border-gray-200 px-2 dark:border-gray-700"
              textClassName="text-left"
              style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.latestContent }}
            >
              {t('church.prayerTableLatestContent')}
            </TableHead>
            <TableHead
              className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
              textClassName="text-center"
              style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.updatedAt }}
            >
              {t('church.prayerTableUpdatedAt')}
            </TableHead>
            <TableHead
              className="items-center px-2"
              textClassName="text-center"
              style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.createdAt }}
            >
              {t('church.prayerTableCreatedAt')}
            </TableHead>
          </TableHeader>
          <TableBody>
            {sortedPrayers.map((prayer, index) => (
              <TableRow
                key={prayer.id}
                isLast={index === sortedPrayers.length - 1}
                selected={expandedPrayerId === prayer.id}
                onPress={() =>
                  setExpandedPrayerId((current) => (current === prayer.id ? null : prayer.id))
                }
              >
                <TableCell
                  className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                  style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.requester }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-center text-xs font-semibold leading-4 text-gray-900 dark:text-white"
                  >
                    {getPrayerCellText(prayer.requester)}
                  </Text>
                </TableCell>
                <TableCell
                  className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                  style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.relation }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-center text-xs font-semibold leading-4 text-gray-900 dark:text-white"
                  >
                    {getPrayerCellText(prayer.relation)}
                  </Text>
                </TableCell>
                <TableCell
                  className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                  style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.target }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-center text-xs font-semibold leading-4 text-gray-900 dark:text-white"
                  >
                    {getPrayerCellText(prayer.target)}
                  </Text>
                </TableCell>
                <TableCell
                  className="items-start border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                  style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.latestContent }}
                >
                  <Text
                    numberOfLines={2}
                    className="text-left text-xs leading-4 text-gray-700 dark:text-gray-200"
                  >
                    {prayer.latestContent || t('church.noPrayerContents')}
                  </Text>
                </TableCell>
                <TableCell
                  className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                  style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.updatedAt }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-center text-[11px] leading-4 text-gray-700 dark:text-gray-200"
                  >
                    {formatShortDateTime(prayer.updatedAt)}
                  </Text>
                </TableCell>
                <TableCell
                  className="items-center px-2 py-2"
                  style={{ width: CHURCH_PRAYER_COLUMN_WIDTHS.createdAt }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-center text-[11px] leading-4 text-gray-700 dark:text-gray-200"
                  >
                    {formatShortDateTime(prayer.createdAt)}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {expandedPrayer ? renderPrayerDetail(expandedPrayer) : null}
      </>
    );
  };

  const tabLabel = (tab: DetailTab) => t(`church.tabs.${tab}`);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={churchDetail.church.name} onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: widePageMaxWidth, alignSelf: 'center' }}>
        <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-2xl font-semibold text-gray-900 dark:text-white">
                {churchDetail.church.name}
              </Text>
              {churchDetail.church.description ? (
                <Text className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  {churchDetail.church.description}
                </Text>
              ) : (
                <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('church.noDescription')}
                </Text>
              )}
              <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('church.memberCount').replace('{count}', String(churchDetail.church.memberCount))}
              </Text>
              {churchDetail.church.myTeamName ? (
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('church.teamLabel')} {churchDetail.church.myTeamName}
                </Text>
              ) : null}
            </View>

            <View className="items-end gap-2">
              {churchDetail.church.myRole ? <ChurchRoleBadge role={churchDetail.church.myRole} /> : null}
              {churchDetail.church.isSuperAdmin ? (
                <ActionTextButton
                  onPress={() => setEditChurchInfoVisible(true)}
                  label={t('church.editInfo')}
                  action="secondary"
                  variant="outline"
                  className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                  textClassName="font-semibold text-gray-900 dark:text-white"
                />
              ) : null}
              {dataUserId &&
              churchDetail.church.myRole &&
              churchDetail.church.myRole !== 'super_admin' ? (
                <ActionTextButton
                  onPress={() =>
                    confirmDestructive(t('church.leaveConfirm'), async () => {
                      setProcessingKey('leave-church');
                      try {
                        await leaveChurch(churchDetail.church.id);
                        showToast(t('toast.churchLeft'));
                        router.replace('/churches' as never);
                      } catch (leaveError) {
                        showToast(
                          leaveError instanceof Error ? leaveError.message : t('church.leaveFailed'),
                        );
                      } finally {
                        setProcessingKey(null);
                      }
                    })
                  }
                  disabled={processingKey === 'leave-church'}
                  label={t('church.leave')}
                  action="secondary"
                  variant="outline"
                  className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                  textClassName="font-semibold text-gray-900 dark:text-white"
                />
              ) : null}
              {canDeleteChurch ? (
                <ActionTextButton
                  onPress={() =>
                    confirmDestructive(t('church.deleteChurchConfirm'), async () => {
                      setProcessingKey('delete-church');
                      try {
                        await deleteChurch(churchDetail.church.id);
                        showToast(t('toast.churchDeleted'));
                        router.replace('/churches' as never);
                      } catch (deleteError) {
                        showToast(
                          getChurchActionErrorMessage(
                            deleteError,
                            t,
                            'church.deleteChurchFailed',
                          ),
                        );
                      } finally {
                        setProcessingKey(null);
                      }
                    })
                  }
                  disabled={processingKey === 'delete-church'}
                  label={t('church.deleteChurch')}
                  action="negative"
                  variant="outline"
                  className="rounded-2xl border-red-200 px-4 py-3 dark:border-red-900"
                  textClassName="font-semibold text-red-500"
                />
              ) : null}
            </View>
          </View>
          {churchDetail.church.isSuperAdmin && hasOtherMembers ? (
            <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('church.deleteRequiresNoOtherMembers')}
            </Text>
          ) : null}
        </View>

        <View className="mb-4 flex-row rounded-2xl bg-gray-200 p-1 dark:bg-gray-800">
          {(['members', 'plans', 'prayers', 'teams'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <Button
                key={tab}
                onPress={() => setActiveTab(tab)}
                action={active ? 'primary' : 'secondary'}
                variant={active ? 'solid' : 'outline'}
                className={`h-auto flex-1 rounded-2xl border-0 px-3 py-3 ${
                  active ? 'bg-white dark:bg-gray-900' : 'bg-transparent'
                }`}
              >
                <ButtonText
                  className={`text-center text-sm font-semibold ${
                    active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tabLabel(tab)}
                </ButtonText>
              </Button>
            );
          })}
        </View>

        {activeTab === 'members' ? (
          <>
            {churchDetail.church.canManageMembers && churchDetail.pendingJoinRequests.length > 0 ? (
              <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                  {t('church.pendingRequests')}
                </Text>
                {churchDetail.pendingJoinRequests.map((request) => (
                  <View
                    key={request.id}
                    className="mb-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <Text className="font-semibold text-gray-900 dark:text-white">
                      {request.requester.displayName}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {request.requester.email ?? t('church.emailHidden')}
                    </Text>

                    <View className="mt-4 flex-row flex-wrap gap-2">
                      <ActionTextButton
                        onPress={() => openRequestTeamPicker(request.id)}
                        label={
                          selectedRequestTeamIds[request.id]
                            ? churchDetail.teams.find((team) => team.id === selectedRequestTeamIds[request.id])?.name ?? t('church.noTeam')
                            : t('church.noTeam')
                        }
                        action="secondary"
                        variant="outline"
                        className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                        textClassName="font-semibold text-gray-900 dark:text-white"
                      />
                      <ActionTextButton
                        onPress={async () => {
                          setProcessingKey(`approve-${request.id}`);
                          try {
                            await approveJoinRequest({
                              requestId: request.id,
                              churchId: churchDetail.church.id,
                              requesterUserId: request.requesterUserId,
                              teamId: selectedRequestTeamIds[request.id] || null,
                            });
                            showToast(t('toast.joinRequestApproved'));
                          } catch (approveError) {
                            showToast(
                              approveError instanceof Error
                                ? approveError.message
                                : t('church.approveFailed'),
                            );
                          } finally {
                            setProcessingKey(null);
                          }
                        }}
                        disabled={processingKey === `approve-${request.id}`}
                        label={t('church.approve')}
                        className="rounded-2xl bg-primary-500 px-4 py-3"
                        textClassName="font-semibold text-white"
                      />
                      <ActionTextButton
                        onPress={async () => {
                          setProcessingKey(`reject-${request.id}`);
                          try {
                            await rejectJoinRequest({
                              requestId: request.id,
                              churchId: churchDetail.church.id,
                            });
                            showToast(t('toast.joinRequestRejected'));
                          } catch (rejectError) {
                            showToast(
                              rejectError instanceof Error
                                ? rejectError.message
                                : t('church.rejectFailed'),
                            );
                          } finally {
                            setProcessingKey(null);
                          }
                        }}
                        disabled={processingKey === `reject-${request.id}`}
                        label={t('church.reject')}
                        action="secondary"
                        variant="outline"
                        className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                        textClassName="font-semibold text-gray-900 dark:text-white"
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {churchDetail.members.map((member) => {
              const teamSelectValue = selectedMemberTeamIds[member.userId] ?? member.teamId ?? '';
              const canTransferSuperAdmin =
                churchDetail.church.isSuperAdmin && member.userId !== dataUserId;
              const canToggleDeputy =
                churchDetail.church.isSuperAdmin &&
                member.userId !== churchDetail.church.superAdminUserId &&
                member.userId !== churchDetail.church.createdByUserId;
              const canManageMemberTeam =
                churchDetail.church.isSuperAdmin ||
                (churchDetail.church.isDeputyAdmin && member.role === 'member');
              const canRemoveMember =
                member.userId !== dataUserId &&
                (churchDetail.church.isSuperAdmin ||
                  (churchDetail.church.isDeputyAdmin && member.role === 'member'));

              return (
                <View
                  key={member.userId}
                  className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-semibold text-gray-900 dark:text-white">
                          {member.profile.displayName}
                        </Text>
                        <ChurchRoleBadge role={member.role} />
                      </View>
                      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {member.profile.email ?? t('church.emailHidden')}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {member.teamName
                          ? `${t('church.teamLabel')} ${member.teamName}`
                          : t('church.noTeamAssigned')}
                      </Text>
                    </View>

                    <View className="items-end gap-2">
                      {canTransferSuperAdmin ? (
                        <ActionTextButton
                          onPress={() =>
                            confirmDestructive(
                              t('church.transferSuperAdminConfirm').replace(
                                '{name}',
                                member.profile.displayName,
                              ),
                              async () => {
                                setProcessingKey(`transfer-super-admin-${member.userId}`);
                                try {
                                  await transferSuperAdmin({
                                    churchId: churchDetail.church.id,
                                    targetUserId: member.userId,
                                  });
                                  showToast(t('toast.superAdminTransferred'));
                                } catch (transferError) {
                                  showToast(
                                    getChurchActionErrorMessage(
                                      transferError,
                                      t,
                                      'church.transferSuperAdminFailed',
                                    ),
                                  );
                                } finally {
                                  setProcessingKey(null);
                                }
                              },
                            )
                          }
                          disabled={processingKey === `transfer-super-admin-${member.userId}`}
                          label={t('church.transferSuperAdmin')}
                          action="primary"
                          variant="outline"
                          className="rounded-2xl border-primary-200 px-4 py-3 dark:border-primary-900"
                          textClassName="font-semibold text-primary-600 dark:text-primary-400"
                        />
                      ) : null}
                      {canToggleDeputy ? (
                        <ActionTextButton
                          onPress={async () => {
                            setProcessingKey(`role-${member.userId}`);
                            try {
                              await updateMemberRole({
                                churchId: churchDetail.church.id,
                                userId: member.userId,
                                role: member.role === 'deputy_admin' ? 'member' : 'deputy_admin',
                              });
                              showToast(
                                member.role === 'deputy_admin'
                                  ? t('toast.deputyRevoked')
                                  : t('toast.deputyGranted'),
                              );
                            } catch (roleError) {
                              showToast(
                                roleError instanceof Error
                                  ? roleError.message
                                  : t('church.roleUpdateFailed'),
                              );
                            } finally {
                              setProcessingKey(null);
                            }
                          }}
                          disabled={processingKey === `role-${member.userId}`}
                          label={
                            member.role === 'deputy_admin'
                              ? t('church.revokeDeputy')
                              : t('church.grantDeputy')
                          }
                          action="secondary"
                          variant="outline"
                          className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                          textClassName="font-semibold text-gray-900 dark:text-white"
                        />
                      ) : null}

                      {canRemoveMember ? (
                        <ActionTextButton
                          onPress={() =>
                            confirmDestructive(
                              t('church.removeMemberConfirm').replace(
                                '{name}',
                                member.profile.displayName,
                              ),
                              async () => {
                                setProcessingKey(`remove-${member.userId}`);
                                try {
                                  await removeMember({
                                    churchId: churchDetail.church.id,
                                    userId: member.userId,
                                  });
                                  showToast(t('toast.memberRemoved'));
                                } catch (removeError) {
                                  showToast(
                                    removeError instanceof Error
                                      ? removeError.message
                                      : t('church.memberRemoveFailed'),
                                  );
                                } finally {
                                  setProcessingKey(null);
                                }
                              },
                            )
                          }
                          disabled={processingKey === `remove-${member.userId}`}
                          label={t('church.removeMember')}
                          action="negative"
                          variant="outline"
                          className="rounded-2xl border-red-200 px-4 py-3 dark:border-red-900"
                          textClassName="font-semibold text-red-500"
                        />
                      ) : null}
                    </View>
                  </View>

                  {canManageMemberTeam ? (
                    <View className="mt-4 flex-row flex-wrap gap-2">
                      <ActionTextButton
                        onPress={() => openMemberTeamPicker(member.userId, teamSelectValue)}
                        label={
                          teamSelectValue
                            ? churchDetail.teams.find((team) => team.id === teamSelectValue)?.name ?? t('church.noTeam')
                            : t('church.noTeam')
                        }
                        action="secondary"
                        variant="outline"
                        className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                        textClassName="font-semibold text-gray-900 dark:text-white"
                      />
                      <ActionTextButton
                        onPress={async () => {
                          setProcessingKey(`member-team-${member.userId}`);
                          try {
                            await updateMemberTeam({
                              churchId: churchDetail.church.id,
                              userId: member.userId,
                              teamId: teamSelectValue || null,
                            });
                            showToast(t('toast.memberTeamUpdated'));
                          } catch (teamError) {
                            showToast(
                              teamError instanceof Error
                                ? teamError.message
                                : t('church.memberTeamUpdateFailed'),
                            );
                          } finally {
                            setProcessingKey(null);
                          }
                        }}
                        disabled={processingKey === `member-team-${member.userId}`}
                        label={t('church.saveTeamAssignment')}
                        className="rounded-2xl bg-primary-500 px-4 py-3"
                        textClassName="font-semibold text-white dark:text-gray-900"
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}
        {activeTab === 'plans' ? (
          <>
            {churchDetail.church.isSuperAdmin ? (
              <ActionTextButton
                onPress={() =>
                  router.push(`/churches/${churchDetail.church.id}/plans/add` as never)
                }
                label={t('church.createChurchPlan')}
                className="mb-4 rounded-2xl bg-primary-500 px-4 py-4"
                textClassName="text-center font-semibold text-white dark:text-gray-900"
              />
            ) : null}

            {churchDetail.plans.length === 0 ? (
              <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
                <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('church.emptyChurchPlans')}
                </Text>
              </View>
            ) : (
              churchDetail.plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  onPress={() =>
                    router.push(`/churches/${churchDetail.church.id}/plans/${plan.id}` as never)
                  }
                  className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plan.planName}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('church.planCreatedBy').replace('{name}', plan.createdByName)}
                      </Text>
                    </View>
                    <View className="rounded-2xl bg-primary-100 px-3 py-2 dark:bg-primary-950/40">
                      <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {plan.averageGoalPercent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </>
        ) : null}
        {activeTab === 'prayers' ? (
          <>
            {churchDetail.church.myRole ? (
              <ActionTextButton
                onPress={() => setCreatePrayerVisible(true)}
                label={t('church.createPrayer')}
                className="mb-4 rounded-2xl bg-primary-500 px-4 py-4"
                textClassName="text-center font-semibold text-white dark:text-gray-900"
              />
            ) : null}

            <View className="mb-5">
              <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                {t('church.churchPrayerSection')}
              </Text>
              {churchWidePrayers.length === 0 ? (
                <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
                  <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('church.emptySharedPrayers')}
                  </Text>
                </View>
              ) : (
                renderPrayerTable(churchWidePrayers)
              )}
            </View>

            {teamPrayerGroups.map((group) => (
              <View key={group.teamId} className="mb-5">
                <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                  {t('church.teamPrayerSectionTitle').replace('{team}', group.teamName)}
                </Text>
                {renderPrayerTable(group.prayers)}
              </View>
            ))}
          </>
        ) : null}
        {activeTab === 'teams' ? (
          <>
            {churchDetail.church.canManageTeams ? (
              <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('church.createTeamTitle')}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('church.createTeamDescription')}
                </Text>
                <View className="mt-4 flex-row gap-3">
                  <TextInput
                    value={creatingTeamName}
                    onChangeText={setCreatingTeamName}
                    placeholder={t('church.teamNamePlaceholder')}
                    placeholderTextColor="#9ca3af"
                    className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                  <ActionTextButton
                    onPress={async () => {
                      setProcessingKey('create-team');
                      try {
                        await createTeam({
                          churchId: churchDetail.church.id,
                          name: creatingTeamName,
                        });
                        setCreatingTeamName('');
                        showToast(t('toast.teamCreated'));
                      } catch (teamError) {
                        showToast(
                          teamError instanceof Error ? teamError.message : t('church.teamCreateFailed'),
                        );
                      } finally {
                        setProcessingKey(null);
                      }
                    }}
                    disabled={processingKey === 'create-team' || !creatingTeamName.trim()}
                    label={t('church.createTeam')}
                    className={`rounded-2xl px-5 ${
                      processingKey === 'create-team' || !creatingTeamName.trim()
                        ? 'bg-gray-300 dark:bg-gray-700'
                        : 'bg-primary-500'
                    }`}
                    textClassName="font-semibold text-white"
                  />
                </View>
              </View>
            ) : null}

            {churchDetail.teams.length === 0 ? (
              <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
                <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('church.emptyTeams')}
                </Text>
              </View>
            ) : (
              churchDetail.teams.map((team) => {
                const leaderValue = selectedTeamLeaderIds[team.id] ?? team.leaderUserId ?? '';
                return (
                  <View
                    key={team.id}
                    className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          {team.name}
                        </Text>
                        <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {t('church.memberCount').replace('{count}', String(team.memberCount))}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {t('church.teamLeader').replace('{name}', team.leaderName ?? '-')}
                        </Text>
                      </View>
                      {churchDetail.church.canManagePlans ? (
                        <ActionTextButton
                          onPress={() =>
                            router.push(
                              `/churches/${churchDetail.church.id}/plans/add?teamId=${team.id}` as never,
                            )
                          }
                          label={t('church.createTeamPlan')}
                          className="rounded-2xl bg-primary-500 px-4 py-3"
                          textClassName="font-semibold text-white dark:text-gray-900"
                        />
                      ) : null}
                    </View>

                    {churchDetail.church.canManageTeams ? (
                      <View className="mt-4 flex-row flex-wrap gap-2">
                        <ActionTextButton
                          onPress={() => openLeaderPicker(team.id, leaderValue)}
                          label={
                            leaderValue
                              ? churchDetail.members.find((member) => member.userId === leaderValue)?.profile
                                  .displayName ?? t('church.noLeader')
                              : t('church.noLeader')
                          }
                          action="secondary"
                          variant="outline"
                          className="rounded-2xl border-gray-200 px-4 py-3 dark:border-gray-800"
                          textClassName="font-semibold text-gray-900 dark:text-white"
                        />
                        <ActionTextButton
                          onPress={async () => {
                            setProcessingKey(`leader-${team.id}`);
                            try {
                              await updateTeamLeader({
                                churchId: churchDetail.church.id,
                                teamId: team.id,
                                leaderUserId: leaderValue || null,
                              });
                              showToast(t('toast.teamLeaderUpdated'));
                            } catch (leaderError) {
                              showToast(
                                leaderError instanceof Error
                                  ? leaderError.message
                                  : t('church.teamLeaderUpdateFailed'),
                              );
                            } finally {
                              setProcessingKey(null);
                            }
                          }}
                          disabled={processingKey === `leader-${team.id}`}
                          label={t('church.saveLeader')}
                          className="rounded-2xl bg-primary-500 px-4 py-3"
                          textClassName="font-semibold text-white dark:text-gray-900"
                        />
                      </View>
                    ) : null}

                    {team.plans.length === 0 ? (
                      <View className="mt-4 rounded-2xl border border-dashed border-gray-200 px-4 py-6 dark:border-gray-800">
                        <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                          {t('church.emptyTeamPlans')}
                        </Text>
                      </View>
                    ) : (
                      <View className="mt-4">
                        {team.plans.map((plan) => (
                          <Pressable
                            key={plan.id}
                            onPress={() =>
                              router.push(`/churches/${churchDetail.church.id}/plans/${plan.id}` as never)
                            }
                            className="mb-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                          >
                            <View className="flex-row items-start justify-between gap-3">
                              <View className="flex-1">
                                <Text className="font-semibold text-gray-900 dark:text-white">
                                  {plan.planName}
                                </Text>
                                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  {t('church.planCreatedBy').replace('{name}', plan.createdByName)}
                                </Text>
                              </View>
                              <View className="rounded-2xl bg-primary-100 px-3 py-2 dark:bg-primary-950/40">
                                <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                                  {plan.averageGoalPercent.toFixed(1)}%
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : null}
        </View>
      </ScrollView>

      <SelectionSheet
        visible={Boolean(pickerState)}
        title={pickerState?.title ?? ''}
        value={pickerState?.value ?? ''}
        options={pickerState?.options ?? []}
        onClose={() => setPickerState(null)}
        onSelect={handlePickerSelect}
      />

      <ChurchPrayerSheet
        visible={createPrayerVisible}
        mode="create"
        onClose={() => setCreatePrayerVisible(false)}
        audienceOptions={prayerAudienceOptions}
        initialAudienceValue={prayerAudienceOptions[0]?.value ?? ''}
        isSubmitting={createPrayerLoading.isLoading}
        onSubmit={async (input) => {
          await createPrayerLoading.runWithLoading(async () => {
            try {
              await createChurchPrayer({
                churchId: churchDetail.church.id,
                teamId: input.teamId,
                requester: input.requester,
                relation: input.relation,
                target: input.target,
                content: input.content,
              });
              setCreatePrayerVisible(false);
              showToast(t('toast.churchPrayerCreated'));
            } catch (prayerError) {
              showToast(
                prayerError instanceof Error ? prayerError.message : t('church.prayerCreateFailed'),
              );
            }
          });
        }}
      />

      <ChurchPrayerSheet
        visible={editPrayerVisible}
        mode="edit"
        onClose={() => {
          setEditPrayerVisible(false);
          setSelectedPrayer(null);
        }}
        prayer={selectedPrayer}
        isSubmitting={editPrayerLoading.isLoading}
        onSubmit={async (input) => {
          if (!selectedPrayer) return;
          await editPrayerLoading.runWithLoading(async () => {
            try {
              await updateChurchPrayer({
                churchId: churchDetail.church.id,
                prayerId: selectedPrayer.id,
                requester: input.requester,
                relation: input.relation,
                target: input.target,
              });
              if (input.content.trim()) {
                await addChurchPrayerContent({
                  churchId: churchDetail.church.id,
                  prayerId: selectedPrayer.id,
                  content: input.content,
                });
              }
              setEditPrayerVisible(false);
              setSelectedPrayer(null);
              showToast(t('toast.churchPrayerUpdated'));
            } catch (prayerError) {
              showToast(
                prayerError instanceof Error ? prayerError.message : t('church.prayerUpdateFailed'),
              );
            }
          });
        }}
      />

      <ChurchPrayerSheet
        visible={appendPrayerVisible}
        mode="append"
        onClose={() => {
          setAppendPrayerVisible(false);
          setSelectedPrayer(null);
        }}
        prayer={selectedPrayer}
        isSubmitting={appendPrayerLoading.isLoading}
        onSubmit={async (input) => {
          if (!selectedPrayer) return;
          await appendPrayerLoading.runWithLoading(async () => {
            try {
              await addChurchPrayerContent({
                churchId: churchDetail.church.id,
                prayerId: selectedPrayer.id,
                content: input.content,
              });
              setAppendPrayerVisible(false);
              setSelectedPrayer(null);
              showToast(t('toast.churchPrayerContentAdded'));
            } catch (prayerError) {
              showToast(
                prayerError instanceof Error
                  ? prayerError.message
                  : t('church.prayerContentAddFailed'),
              );
            }
          });
        }}
      />

      <ChurchInfoSheet
        visible={editChurchInfoVisible}
        mode="edit"
        initialName={churchDetail.church.name}
        initialDescription={churchDetail.church.description}
        isSubmitting={processingKey === 'update-church-info'}
        onClose={() => setEditChurchInfoVisible(false)}
        onSubmit={async (input) => {
          setProcessingKey('update-church-info');
          try {
            await updateChurchInfo({
              churchId: churchDetail.church.id,
              name: input.name,
              description: input.description,
            });
            setEditChurchInfoVisible(false);
            showToast(t('toast.churchUpdated'));
          } catch (churchError) {
            showToast(
              churchError instanceof Error ? churchError.message : t('church.updateFailed'),
            );
          } finally {
            setProcessingKey(null);
          }
        }}
      />
    </SafeAreaView>
  );
}
