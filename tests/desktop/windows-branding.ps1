param([long]$Handle)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential)] public struct PropertyKey { public Guid fmtid; public uint pid; }
[StructLayout(LayoutKind.Explicit, Size=24)] public struct PropVariant {
  [FieldOffset(0)] public ushort type;
  [FieldOffset(8)] public IntPtr value;
}
[ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPropertyStore {
  [PreserveSig] int GetCount(out uint count);
  [PreserveSig] int GetAt(uint i, out PropertyKey key);
  [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant value);
  [PreserveSig] int SetValue(ref PropertyKey key, ref PropVariant value);
  [PreserveSig] int Commit();
}
public static class TaskbarIdentity {
  [DllImport("shell32.dll")] static extern int SHGetPropertyStoreForWindow(IntPtr hwnd, ref Guid iid, out IPropertyStore store);
  [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropVariant value);
  public static string Read(long handle, uint id) {
    Guid iid = typeof(IPropertyStore).GUID;
    IPropertyStore store;
    Marshal.ThrowExceptionForHR(SHGetPropertyStoreForWindow(new IntPtr(handle), ref iid, out store));
    try {
      PropertyKey key = new PropertyKey { fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), pid = id };
      PropVariant value;
      Marshal.ThrowExceptionForHR(store.GetValue(ref key, out value));
      try { return value.type == 31 ? Marshal.PtrToStringUni(value.value) : null; }
      finally { PropVariantClear(ref value); }
    } finally { Marshal.ReleaseComObject(store); }
  }
}
'@
[ordered]@{
  appId = [TaskbarIdentity]::Read($Handle, 5)
  icon = [TaskbarIdentity]::Read($Handle, 3)
  command = [TaskbarIdentity]::Read($Handle, 2)
  name = [TaskbarIdentity]::Read($Handle, 4)
} | ConvertTo-Json -Compress
