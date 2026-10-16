<?php
// Disable error display for clean output
error_reporting(0);
ini_set('display_errors', 0);

// ✅ Database connection
$conn = mysqli_connect('localhost', 'u107895813_utkarsh21', 'Kaushik001@123', 'u107895813_rxmedo');

// Check connection
if (!$conn) {
    die("Database connection failed: " . mysqli_connect_error());
}

// ✅ Fetch data
$sql = "SELECT * FROM mydata";
$result = mysqli_query($conn, $sql);

if (!$result) {
    die("Query failed: " . mysqli_error($conn));
}

// ✅ Set headers for Excel download
header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=users_data.xls");
header("Pragma: no-cache");
header("Expires: 0");

// ✅ Excel column headers
echo "Name\tEmail\tAadhaar Card\tPAN Card\tCard Type\tPurchase Date\tStatus\tRef Code\tReference\n";

// ✅ Data rows
while ($row = mysqli_fetch_assoc($result)) {
    echo ($row['name'] ?? '') . "\t" .
         ($row['email'] ?? '') . "\t" .
         ("'" . ($row['aadhaar_card_no'] ?? '')) . "\t" .
         ($row['pan_card_no'] ?? '') . "\t" .
         ($row['card_type'] ?? '') . "\t" .
         ($row['purchase_date'] ?? '') . "\t" .
         ($row['status'] ?? '') . "\t" .
         ($row['ref_code'] ?? '') . "\t" .
         ($row['reference'] ?? '') . "\n";
}

// ✅ Close connection
mysqli_close($conn);
exit;
?>