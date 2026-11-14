Add-Type @'
using System.Runtime.InteropServices;
public class V9Power {
 [StructLayout(LayoutKind.Sequential)] public struct Status {
  public byte ACLineStatus, BatteryFlag, BatteryLifePercent, SystemStatusFlag;
  public uint BatteryLifeTime, BatteryFullLifeTime;
 }
 [DllImport("kernel32.dll")] public static extern bool GetSystemPowerStatus(out Status value);
}
'@
$v9Status = New-Object V9Power+Status
$ok = [V9Power]::GetSystemPowerStatus([ref]$v9Status)
@{success=$ok;acLineStatus=$v9Status.ACLineStatus;batteryPercent=$v9Status.BatteryLifePercent;powerSaving=$v9Status.SystemStatusFlag;scheme=(powercfg /getactivescheme | Out-String).Trim()} | ConvertTo-Json -Compress
