# Only CDP-reported PIDs of our disposable benchmark Chrome instance are accepted.
# No system power plan, registry, GPU clock or unrelated process is changed.
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class V9ChromeControl {
 [StructLayout(LayoutKind.Sequential)] public struct Power {public uint Version,ControlMask,StateMask;}
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetSystemCpuSetInformation(IntPtr b,uint len,out uint need,IntPtr process,uint flags);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool SetProcessInformation(IntPtr p,int type,ref Power value,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetProcessInformation(IntPtr p,int type,ref Power value,uint size);
 public static int[][] CpuSets(){
  uint n;GetSystemCpuSetInformation(IntPtr.Zero,0,out n,IntPtr.Zero,0);
  IntPtr buffer=Marshal.AllocHGlobal((int)n);var rows=new List<int[]>();
  try{if(!GetSystemCpuSetInformation(buffer,n,out n,IntPtr.Zero,0))throw new Exception("CPU set query failed");
   for(int offset=0;offset<n;){IntPtr p=IntPtr.Add(buffer,offset);int size=Marshal.ReadInt32(p);if(size<8)throw new Exception("CPU set size");
    if(Marshal.ReadInt32(p,4)==0&&size>=32)rows.Add(new int[]{Marshal.ReadInt16(p,12),Marshal.ReadByte(p,14),Marshal.ReadByte(p,15),Marshal.ReadByte(p,18),Marshal.ReadInt32(p,8)});offset+=size;}
  }finally{Marshal.FreeHGlobal(buffer);}return rows.ToArray();
 }
}
'@
$v9CpuSets = [V9ChromeControl]::CpuSets()
$v9BestClass = ($v9CpuSets | ForEach-Object {$_[3]} | Measure-Object -Maximum).Maximum
[long]$v9Mask = 0
foreach($v9Cpu in $v9CpuSets){if($v9Cpu[0] -ne 0 -or $v9Cpu[1] -gt 62){throw 'Multiple CPU groups require a different protocol'};if($v9Cpu[3] -eq $v9BestClass){$v9Mask = $v9Mask -bor ([long]1 -shl $v9Cpu[1])}}
$v9Processes = foreach($v9OwnedId in $v9OwnedIds){
 try{
  $v9Process = Get-Process -Id $v9OwnedId -ErrorAction Stop
  if($v9Process.ProcessName -ne 'chrome'){throw 'Refusing a non-Chrome process'}
  $v9Before = New-Object V9ChromeControl+Power;$v9Before.Version=1
  $v9Read = [V9ChromeControl]::GetProcessInformation($v9Process.Handle,4,[ref]$v9Before,12)
  $v9AffinityBefore = $v9Process.ProcessorAffinity.ToInt64()
  $v9Set = $null
  if($v9Apply){
   $v9State = New-Object V9ChromeControl+Power;$v9State.Version=1;$v9State.ControlMask=5;$v9State.StateMask=0
   $v9Set = [V9ChromeControl]::SetProcessInformation($v9Process.Handle,4,[ref]$v9State,12)
   $v9Process.ProcessorAffinity = [IntPtr]$v9Mask
  }
  $v9After = New-Object V9ChromeControl+Power;$v9After.Version=1
  $v9ReadAfter = [V9ChromeControl]::GetProcessInformation($v9Process.Handle,4,[ref]$v9After,12)
  @{id=$v9OwnedId;name=$v9Process.ProcessName;startUtc=$v9Process.StartTime.ToUniversalTime().ToString('o');read=$v9Read;set=$v9Set;readAfter=$v9ReadAfter;beforeControl=$v9Before.ControlMask;beforeState=$v9Before.StateMask;afterControl=$v9After.ControlMask;afterState=$v9After.StateMask;affinityBefore=$v9AffinityBefore;affinityAfter=$v9Process.ProcessorAffinity.ToInt64();priority=[string]$v9Process.PriorityClass}
 }catch{@{id=$v9OwnedId;error=$_.Exception.Message}}
}
@{cpuSets=$v9CpuSets;selectedEfficiencyClass=$v9BestClass;selectedAffinity=$v9Mask;applied=$v9Apply;processes=@($v9Processes)} | ConvertTo-Json -Depth 8 -Compress
