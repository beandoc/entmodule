'use client';

import { PatientPortal } from '@/components/PatientPortal';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function CarePlanPage() {
  const {
    locale, vestibularMode, hearingMode, orders, selectedOrderId, setSelectedOrderId,
    orderDetails, loadingOrder, orderError, catalogueData, surgeryTime, setSurgeryTime,
    npoTimes, handleSignReceipt, sigSigned,
  } = useAppData();

  return (
    <ClinicalErrorBoundary componentName="PatientPortal">
      <PatientPortal
        locale={locale}
        vestibularMode={vestibularMode}
        hearingMode={hearingMode}
        orders={orders}
        selectedOrderId={selectedOrderId}
        setSelectedOrderId={setSelectedOrderId}
        orderDetails={orderDetails}
        loadingOrder={loadingOrder}
        orderError={orderError}
        catalogueData={catalogueData}
        surgeryTime={surgeryTime}
        setSurgeryTime={setSurgeryTime}
        npoTimes={npoTimes}
        handleSignReceipt={handleSignReceipt}
        sigSigned={sigSigned}
      />
    </ClinicalErrorBoundary>
  );
}
