using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace DeepSeekHarnessInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallForm());
        }
    }

    class InstallForm : Form
    {
        private TextBox txtDir;
        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnInstall;
        private Button btnCancel;
        private string exePath;
        private string tempDir;

        public InstallForm()
        {
            exePath = Application.ExecutablePath;
            tempDir = Path.Combine(Path.GetTempPath(), "dsh_install_" + Guid.NewGuid().ToString("N"));

            Text = "DeepSeek Harness 修复版 - 安装程序";
            Size = new System.Drawing.Size(500, 340);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;

            Label lblTitle = new Label();
            lblTitle.Text = "DeepSeek Harness 修复版";
            lblTitle.Font = new System.Drawing.Font("Microsoft YaHei", 14, System.Drawing.FontStyle.Bold);
            lblTitle.Location = new System.Drawing.Point(20, 20);
            lblTitle.Size = new System.Drawing.Size(440, 30);
            Controls.Add(lblTitle);

            Label lblDesc = new Label();
            lblDesc.Text = "包含修复：\r\n  1. 顶部窗口遮挡修复\r\n  2. 鲸鱼女孩图标替换\r\n  3. 插件市场安装失败修复\r\n  4. 插件市场卸载刷新提示修复";
            lblDesc.Font = new System.Drawing.Font("Microsoft YaHei", 9);
            lblDesc.Location = new System.Drawing.Point(20, 55);
            lblDesc.Size = new System.Drawing.Size(440, 90);
            Controls.Add(lblDesc);

            Label lblDir = new Label();
            lblDir.Text = "安装目录：";
            lblDir.Font = new System.Drawing.Font("Microsoft YaHei", 9);
            lblDir.Location = new System.Drawing.Point(20, 155);
            lblDir.Size = new System.Drawing.Size(80, 20);
            Controls.Add(lblDir);

            txtDir = new TextBox();
            txtDir.Text = @"D:\DeepSeek Harness";
            txtDir.Location = new System.Drawing.Point(100, 153);
            txtDir.Size = new System.Drawing.Size(290, 20);
            Controls.Add(txtDir);

            Button btnBrowse = new Button();
            btnBrowse.Text = "浏览...";
            btnBrowse.Location = new System.Drawing.Point(400, 152);
            btnBrowse.Size = new System.Drawing.Size(60, 23);
            btnBrowse.Click += delegate(object s, EventArgs e)
            {
                using (FolderBrowserDialog dlg = new FolderBrowserDialog())
                {
                    dlg.Description = "选择安装目录";
                    dlg.SelectedPath = txtDir.Text;
                    if (dlg.ShowDialog() == DialogResult.OK)
                        txtDir.Text = dlg.SelectedPath;
                }
            };
            Controls.Add(btnBrowse);

            progressBar = new ProgressBar();
            progressBar.Location = new System.Drawing.Point(20, 195);
            progressBar.Size = new System.Drawing.Size(440, 20);
            progressBar.Minimum = 0;
            progressBar.Maximum = 100;
            Controls.Add(progressBar);

            lblStatus = new Label();
            lblStatus.Text = "准备安装...";
            lblStatus.Font = new System.Drawing.Font("Microsoft YaHei", 8);
            lblStatus.Location = new System.Drawing.Point(20, 220);
            lblStatus.Size = new System.Drawing.Size(440, 20);
            Controls.Add(lblStatus);

            btnInstall = new Button();
            btnInstall.Text = "安装";
            btnInstall.Location = new System.Drawing.Point(290, 250);
            btnInstall.Size = new System.Drawing.Size(80, 25);
            btnInstall.Click += new EventHandler(BtnInstall_Click);
            Controls.Add(btnInstall);

            btnCancel = new Button();
            btnCancel.Text = "取消";
            btnCancel.Location = new System.Drawing.Point(380, 250);
            btnCancel.Size = new System.Drawing.Size(80, 25);
            btnCancel.Click += delegate(object s, EventArgs e) { Close(); };
            Controls.Add(btnCancel);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            txtDir.Enabled = false;

            try
            {
                UpdateStatus("正在提取安装数据...", 5);
                string programTar;
                string fixTar;
                ExtractData(out programTar, out fixTar);
                UpdateStatus("安装数据提取完成", 15);

                string installDir = txtDir.Text;
                UpdateStatus("正在解压程序文件...", 20);
                if (!Directory.Exists(installDir))
                    Directory.CreateDirectory(installDir);

                RunProcess("tar.exe", "-xzf \"" + programTar + "\" -C \"" + installDir + "\"");
                UpdateStatus("程序文件解压完成", 35);

                // 自动启动程序一次，等待 dshmarket 完整初始化
                UpdateStatus("正在首次启动程序初始化...", 40);
                string appExePath = Path.Combine(installDir, "DeepSeek Harness.exe");
                Process initProcess = null;
                string dshmarketDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    @"open-deepseek-harness-desktop\dsh-home\profiles\web\node_modules\dshmarket");

                if (File.Exists(appExePath))
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = appExePath;
                        psi.WorkingDirectory = installDir;
                        psi.UseShellExecute = true;
                        initProcess = Process.Start(psi);

                        // 等待 dshmarket 目录出现（最多 90 秒）
                        int timeout = 90;
                        int elapsed = 0;
                        while (!Directory.Exists(dshmarketDir) && elapsed < timeout)
                        {
                            System.Threading.Thread.Sleep(1000);
                            elapsed++;
                            int prog = 40 + (int)(elapsed * 15.0 / timeout);
                            UpdateStatus("正在等待程序初始化... (" + elapsed + "/" + timeout + "s)", prog);
                        }

                        // 再等 8 秒确保 dshmarket 完整初始化
                        if (Directory.Exists(dshmarketDir))
                        {
                            for (int i = 0; i < 8; i++)
                            {
                                System.Threading.Thread.Sleep(1000);
                                UpdateStatus("正在完成初始化... (" + (8 - i) + "s)", 55);
                            }
                        }
                    }
                    catch { }
                    finally
                    {
                        // 关闭程序
                        try
                        {
                            if (initProcess != null && !initProcess.HasExited)
                            {
                                initProcess.CloseMainWindow();
                                if (!initProcess.WaitForExit(10000))
                                {
                                    initProcess.Kill();
                                }
                            }
                        }
                        catch { }
                        // 等待进程完全退出
                        System.Threading.Thread.Sleep(3000);
                    }
                }

                UpdateStatus("正在应用插件市场修复...", 60);
                string fixExtractDir = Path.Combine(tempDir, "fix");
                Directory.CreateDirectory(fixExtractDir);
                RunProcess("tar.exe", "-xzf \"" + fixTar + "\" -C \"" + fixExtractDir + "\"");

                // dshmarket 目录已由程序初始化创建，直接应用修复
                if (Directory.Exists(dshmarketDir))
                {
                    string[] fixFiles = {
                        @"lib\dsh-cli.js",
                        @"lib\routes.js",
                        @"client\client.js"
                    };
                    foreach (string f in fixFiles)
                    {
                        string src = Path.Combine(fixExtractDir, f);
                        string dst = Path.Combine(dshmarketDir, f);
                        if (File.Exists(src))
                        {
                            Directory.CreateDirectory(Path.GetDirectoryName(dst));
                            File.Copy(src, dst, true);
                        }
                    }
                    UpdateStatus("插件市场修复已应用", 80);
                }
                else
                {
                    UpdateStatus("警告：dshmarket 初始化可能未完成，请手动运行修复", 80);
                }

                UpdateStatus("正在创建桌面快捷方式...", 85);
                string exePath = Path.Combine(installDir, "DeepSeek Harness.exe");
                if (File.Exists(exePath))
                {
                    string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                    string shortcutPath = Path.Combine(desktop, "DeepSeek Harness.lnk");
                    CreateShortcut(shortcutPath, exePath, installDir);
                }

                UpdateStatus("安装完成！", 100);

                MessageBox.Show(
                    "DeepSeek Harness 修复版安装完成！\r\n\r\n安装目录：" + installDir + "\r\n\r\n插件市场修复已自动应用，可直接使用。",
                    "安装完成",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                Close();
            }
            catch (Exception ex)
            {
                UpdateStatus("安装失败：" + ex.Message, 0);
                MessageBox.Show("安装失败：\r\n" + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                btnInstall.Enabled = true;
                btnCancel.Enabled = true;
                txtDir.Enabled = true;
            }
            finally
            {
                try { if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true); } catch { }
            }
        }

        private void ExtractData(out string programTar, out string fixTar)
        {
            Directory.CreateDirectory(tempDir);
            programTar = Path.Combine(tempDir, "program.tar.gz");
            fixTar = Path.Combine(tempDir, "fix.tar.gz");

            using (FileStream fs = new FileStream(exePath, FileMode.Open, FileAccess.Read))
            using (BinaryReader br = new BinaryReader(fs))
            {
                fs.Seek(-8, SeekOrigin.End);
                long fixSize = br.ReadInt64();
                fs.Seek(-8 - fixSize - 8, SeekOrigin.End);
                long programSize = br.ReadInt64();

                fs.Seek(-8 - fixSize - 8 - programSize, SeekOrigin.End);
                byte[] programData = br.ReadBytes((int)programSize);
                File.WriteAllBytes(programTar, programData);
                fs.Seek(8, SeekOrigin.Current);
                byte[] fixData = br.ReadBytes((int)fixSize);
                File.WriteAllBytes(fixTar, fixData);
            }
        }

        private void RunProcess(string fileName, string arguments)
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = fileName;
            psi.Arguments = arguments;
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.CreateNoWindow = true;
            using (Process p = Process.Start(psi))
            {
                p.WaitForExit();
                if (p.ExitCode != 0)
                    throw new Exception(fileName + " 失败，错误码：" + p.ExitCode + "\r\n" + p.StandardError.ReadToEnd());
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string workingDir)
        {
            Type shellType = Type.GetTypeFromProgID("WScript.Shell");
            object shell = Activator.CreateInstance(shellType);
            object shortcut = shellType.InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
            Type shortcutType = shortcut.GetType();
            shortcutType.InvokeMember("TargetPath", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
            shortcutType.InvokeMember("WorkingDirectory", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
            shortcutType.InvokeMember("Description", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { "DeepSeek Harness 修复版" });
            shortcutType.InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, shortcut, null);
        }

        private void UpdateStatus(string text, int progress)
        {
            lblStatus.Text = text;
            progressBar.Value = progress;
            Application.DoEvents();
        }
    }
}
