using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace DeepSeekHarnessUninstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new UninstallForm());
        }
    }

    class UninstallForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnUninstall;
        private Button btnCancel;
        private string installDir;

        public UninstallForm()
        {
            installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');

            Text = "DeepSeek Harness 修复版 - 卸载程序";
            Size = new System.Drawing.Size(480, 280);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;

            Label lblTitle = new Label();
            lblTitle.Text = "DeepSeek Harness 修复版 卸载";
            lblTitle.Font = new System.Drawing.Font("Microsoft YaHei", 14, System.Drawing.FontStyle.Bold);
            lblTitle.Location = new System.Drawing.Point(20, 20);
            lblTitle.Size = new System.Drawing.Size(420, 30);
            Controls.Add(lblTitle);

            Label lblDesc = new Label();
            lblDesc.Text = "将从您的计算机中移除 DeepSeek Harness 修复版。\r\n\r\n卸载将删除：\r\n  - 程序文件（安装目录）\r\n  - 插件配置和数据（AppData）\r\n  - 桌面快捷方式";
            lblDesc.Font = new System.Drawing.Font("Microsoft YaHei", 9);
            lblDesc.Location = new System.Drawing.Point(20, 55);
            lblDesc.Size = new System.Drawing.Size(420, 100);
            Controls.Add(lblDesc);

            progressBar = new ProgressBar();
            progressBar.Location = new System.Drawing.Point(20, 165);
            progressBar.Size = new System.Drawing.Size(420, 20);
            progressBar.Minimum = 0;
            progressBar.Maximum = 100;
            Controls.Add(progressBar);

            lblStatus = new Label();
            lblStatus.Text = "准备卸载...";
            lblStatus.Font = new System.Drawing.Font("Microsoft YaHei", 8);
            lblStatus.Location = new System.Drawing.Point(20, 190);
            lblStatus.Size = new System.Drawing.Size(420, 20);
            Controls.Add(lblStatus);

            btnUninstall = new Button();
            btnUninstall.Text = "卸载";
            btnUninstall.Location = new System.Drawing.Point(290, 220);
            btnUninstall.Size = new System.Drawing.Size(80, 25);
            btnUninstall.Click += new EventHandler(BtnUninstall_Click);
            Controls.Add(btnUninstall);

            btnCancel = new Button();
            btnCancel.Text = "取消";
            btnCancel.Location = new System.Drawing.Point(380, 220);
            btnCancel.Size = new System.Drawing.Size(80, 25);
            btnCancel.Click += delegate(object s, EventArgs e) { Close(); };
            Controls.Add(btnCancel);
        }

        private void BtnUninstall_Click(object sender, EventArgs e)
        {
            DialogResult result = MessageBox.Show(
                "确定要卸载 DeepSeek Harness 修复版吗？\r\n\r\n所有插件配置和数据将被删除，此操作不可撤销。",
                "确认卸载",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (result != DialogResult.Yes)
                return;

            btnUninstall.Enabled = false;
            btnCancel.Enabled = false;

            try
            {
                UpdateStatus("正在关闭运行中的程序...", 10);
                KillProcesses();

                UpdateStatus("正在删除桌面快捷方式...", 20);
                RemoveDesktopShortcut();

                UpdateStatus("正在删除开始菜单快捷方式...", 30);
                RemoveStartMenuShortcut();

                UpdateStatus("正在删除插件配置和数据...", 50);
                RemoveAppData();

                UpdateStatus("正在删除程序文件...", 70);
                RemoveProgramFiles();

                UpdateStatus("卸载完成！", 100);

                MessageBox.Show(
                    "DeepSeek Harness 修复版已成功卸载！\r\n\r\n感谢您的使用。",
                    "卸载完成",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                Close();
            }
            catch (Exception ex)
            {
                UpdateStatus("卸载失败：" + ex.Message, 0);
                MessageBox.Show("卸载失败：\r\n" + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                btnUninstall.Enabled = true;
                btnCancel.Enabled = true;
            }
        }

        private void KillProcesses()
        {
            try
            {
                Process[] processes = Process.GetProcessesByName("DeepSeek Harness");
                foreach (Process p in processes)
                {
                    try
                    {
                        p.Kill();
                        p.WaitForExit(5000);
                    }
                    catch { }
                }
                System.Threading.Thread.Sleep(1000);
            }
            catch { }
        }

        private void RemoveDesktopShortcut()
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktop, "DeepSeek Harness.lnk");
                if (File.Exists(shortcutPath))
                {
                    File.Delete(shortcutPath);
                }
            }
            catch { }
        }

        private void RemoveStartMenuShortcut()
        {
            try
            {
                string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
                string shortcutPath = Path.Combine(startMenu, "DeepSeek Harness.lnk");
                if (File.Exists(shortcutPath))
                {
                    File.Delete(shortcutPath);
                }
                string programsDir = Path.Combine(startMenu, "Programs");
                if (Directory.Exists(programsDir))
                {
                    string[] shortcuts = Directory.GetFiles(programsDir, "*DeepSeek*.lnk");
                    foreach (string s in shortcuts)
                    {
                        try { File.Delete(s); } catch { }
                    }
                }
            }
            catch { }
        }

        private void RemoveAppData()
        {
            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string dshDir = Path.Combine(appData, "open-deepseek-harness-desktop");
                if (Directory.Exists(dshDir))
                {
                    Directory.Delete(dshDir, true);
                }
            }
            catch { }
        }

        private void RemoveProgramFiles()
        {
            try
            {
                string uninstallerPath = Application.ExecutablePath;
                string batchFile = Path.Combine(Path.GetTempPath(), "dsh_uninstall_" + Guid.NewGuid().ToString("N") + ".bat");
                string batchContent = "@echo off\r\n" +
                    "timeout /t 2 /nobreak >nul\r\n" +
                    "rmdir /s /q \"" + installDir + "\"\r\n" +
                    "del /f /q \"" + batchFile + "\"\r\n";
                File.WriteAllText(batchFile, batchContent);

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = batchFile;
                psi.UseShellExecute = true;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                Process.Start(psi);
            }
            catch { }
        }

        private void UpdateStatus(string text, int progress)
        {
            lblStatus.Text = text;
            progressBar.Value = progress;
            Application.DoEvents();
        }
    }
}
