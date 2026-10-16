<?php
session_start();
require_once __DIR__ . '/libs/fpdf.php';
function makeCircularImage($srcPath, $destPath) {
    $ext = strtolower(pathinfo($srcPath, PATHINFO_EXTENSION));
    if ($ext === 'png') {
        $src = imagecreatefrompng($srcPath);
    } else {
        $src = imagecreatefromjpeg($srcPath);
    }

    $size = min(imagesx($src), imagesy($src));
    $dst = imagecreatetruecolor($size, $size);

    // Transparent background
    imagesavealpha($dst, true);
    $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
    imagefill($dst, 0, 0, $transparent);

    // Copy pixels only inside circle
    for ($x = 0; $x < $size; $x++) {
        for ($y = 0; $y < $size; $y++) {
            $dx = $x - $size/2;
            $dy = $y - $size/2;
            if ($dx*$dx + $dy*$dy <= ($size/2)*($size/2)) {
                $color = imagecolorat($src, $x, $y);
                imagesetpixel($dst, $x, $y, $color);
            }
        }
    }

    imagepng($dst, $destPath);
    unset($dst);
    unset($src);
}



// ✅ DB connection
$con = mysqli_connect('localhost', 'u107895813_utkarsh21', 'Kaushik001@123', 'u107895813_rxmedo');



if (!$con) { die("❌ DB connection failed"); }

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
  echo "<script>alert('Please login first.'); window.location.href='login.html';</script>";
  exit;
}

// ✅ Fetch user details (include status for payment check)
$stmt = $con->prepare("SELECT name, email, card_type, purchase_date, status,
  serial_rx_medo_card, serial_rx_medo_family_card, serial_rx_medo_youngshield_card,
  serial_rx_medo_citizencare_card, serial_rx_medo_guardiancare_card, serial_rx_medo_seniorshield_card,
  serial_rx_medo_familysecure_card, serial_rx_medo_topup_card, serial_rx_medo_family_topup_card,profile_pic
  FROM mydata WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

// ✅ Block if payment not completed
if (($user['status'] ?? '') !== 'active') {
  echo "<script>
    alert('❌ Payment not completed. Please complete payment before downloading your card.');
    window.location.href='payscript.php';
  </script>";
  exit;
}

$name          = $user['name'];
$card_type     = trim($user['card_type'] ?? '');
$purchase_date = $user['purchase_date'];
$profilePic = $user['profile_pic'] ?? null;

// ✅ Normalize card_type (same as login.php)
$cardKey = strtolower($card_type);
$normalizeMap = [
  'rx medo top-up card'         => 'RX Medo Top Up Card',
  'rx medo topup card'          => 'RX Medo Top Up Card',
  'rx medo top up card'         => 'RX Medo Top Up Card',
  'rx medo family top-up card'  => 'RX Medo Family Top-Up Card',
  'rx medo family topup card'   => 'RX Medo Family Top-Up Card',
  'rx medo family top up card'  => 'RX Medo Family Top-Up Card',
  'rx medo familysecure card'   => 'RX Medo FamilySecure Card',
  'rx medo family secure card'  => 'RX Medo FamilySecure Card'
];
if (isset($normalizeMap[$cardKey])) {
  $card_type = $normalizeMap[$cardKey];
}

// ✅ Map card types to image paths + serial column + prefix
$cardMap = [
  'RX Medo Card'               => ['front' => "rx medocardimages/Medo Card Front.jpeg", 'back' => "rx medocardimages/Medo Card Back.jpeg", 'col' => 'serial_rx_medo_card',              'prefix' => 'RMC025'],
  'RX Medo Family Card'        => ['front' => "rx medocardimages/Medo Family Front.jpeg", 'back' => "rx medocardimages/Medo Family Back.jpeg", 'col' => 'serial_rx_medo_family_card',       'prefix' => 'RMFC025'],
  'RX Medo YoungShield Card'   => ['front' => "rx medocardimages/Medo Young Shield Front.jpeg", 'back' => "rx medocardimages/Medo Young Shield Back.jpeg", 'col' => 'serial_rx_medo_youngshield_card',  'prefix' => 'RMYSC025'],
  'RX Medo CitizenCare Card'   => ['front' => "rx medocardimages/Medo Citizen Care Front.jpeg", 'back' => "rx medocardimages/Medo Citizen Care Back.jpeg", 'col' => 'serial_rx_medo_citizencare_card',  'prefix' => 'RMCCC025'],
  'RX Medo GuardianCare Card'  => ['front' => "rx medocardimages/Medo Guardian Care Front.jpeg", 'back' => "rx medocardimages/Medo Guardian Care Back.jpeg", 'col' => 'serial_rx_medo_guardiancare_card', 'prefix' => 'RMGCC025'],
  'RX Medo SeniorShield Card'  => ['front' => "rx medocardimages/Medo Senior Shield Front.jpeg", 'back' => "rx medocardimages/Medo Senior Shield Back.jpeg", 'col' => 'serial_rx_medo_seniorshield_card', 'prefix' => 'RMSSC025'],
  'RX Medo FamilySecure Card'  => ['front' => "rx medocardimages/Medo Family Secure Front.jpeg", 'back' => "rx medocardimages/Medo Family Secure Back.jpeg", 'col' => 'serial_rx_medo_familysecure_card', 'prefix' => 'RMFSC025'],
  'RX Medo Top Up Card'        => ['front' => "rx medocardimages/Medo Top-Up Front.jpeg", 'back' => "rx medocardimages/Medo Top-up Back.jpeg", 'col' => 'serial_rx_medo_topup_card',        'prefix' => 'RMTP025'],
  'RX Medo Family Top-Up Card' => ['front' => "rx medocardimages/Medo Family Top-Up Front.jpeg", 'back' => "rx medocardimages/Medo Family Top-Up Back.jpeg", 'col' => 'serial_rx_medo_family_topup_card', 'prefix' => 'RMFTP025']
];

if (!isset($cardMap[$card_type])) {
  die("❌ Unknown card type selected: " . htmlspecialchars($card_type));
}

$frontImage = $cardMap[$card_type]['front'];
$backImage  = $cardMap[$card_type]['back'];
$serialCol  = $cardMap[$card_type]['col'];
$prefix     = $cardMap[$card_type]['prefix'];
$serial     = $user[$serialCol];

// ✅ Assign serial if not already set
if (empty($serial)) {
  $countRes = $con->query("SELECT COUNT(*) AS total FROM mydata WHERE $serialCol IS NOT NULL");
  $count = $countRes->fetch_assoc()['total'] + 1;
  $suffix = str_pad((string)$count, 6, '0', STR_PAD_LEFT);
  $serial = $prefix . $suffix;

  // Save to DB
  $upd = $con->prepare("UPDATE mydata SET $serialCol = ? WHERE id = ?");
  $upd->bind_param("si", $serial, $user_id);
  $upd->execute();
  $upd->close();
}

$con->close();

// ✅ Calculate validity
if (empty($purchase_date)) {
  $purchase_date = date('Y-m-d');
}
$validUpto = date('d-m-Y', strtotime('+1 year -1 day', strtotime($purchase_date)));

// ✅ Output file path
$outputDir = 'cards/generated/';
if (!is_dir($outputDir)) { mkdir($outputDir, 0777, true); }
$pdfFile = $outputDir . preg_replace('/\s+/', '_', strtolower($name)) . '_card.pdf';

// ✅ PDF generation with FPDF
$pdf = new FPDF('P','mm','A4');

// ---------------- FRONT SIDE ----------------
$pdf->AddPage();
$pdf->Image($frontImage, 10, 20, 190);

// ✅ Profile picture (inside circular frame)
if (!empty($profilePic) && file_exists($profilePic)) {
    $circleX = 40;
    $circleY = 49;
    $circleSize = 50.3;

    $tempFile = __DIR__ . '/temp_circle.png';
    makeCircularImage($profilePic, $tempFile);

    $pdf->Image($tempFile, $circleX, $circleY, $circleSize, $circleSize);

    unlink($tempFile);
}





// ✅ Text details
$pdf->SetFont('Arial','B',15);
$pdf->SetTextColor(255,255,255);

$pdf->SetXY(95, 58);  $pdf->Cell(0, 8, "Name: " . $name);
$pdf->SetXY(95, 68);  $pdf->Cell(0, 8, "Card Type: " . $card_type);
$pdf->SetXY(95, 78);  $pdf->Cell(0, 8, "Serial No: " . $serial);
$pdf->SetXY(95, 88);  $pdf->Cell(0, 8, "Policy No: ");


// ---------------- BACK SIDE ----------------
$pdf->AddPage();
$pdf->Image($backImage, 10, 20, 190);

$pdf->SetFont('Arial','B',18);
$pdf->SetTextColor(0,0,0);
$pdf->SetXY(30, 110); 
$pdf->Cell(0, 8, "Valid Upto: " . $validUpto);

// ✅ Save PDF
$pdf->Output('F', $pdfFile);

// ✅ Trigger download
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . basename($pdfFile) . '"');
readfile($pdfFile);
exit;