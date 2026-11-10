document.getElementById('exitProgramBtn')?.addEventListener('click', () => {
    if (!confirm('确定要退出程序吗？')) return;

    window.close();
    setTimeout(() => {
        if (!window.closed) {
            alert('浏览器不允许网页关闭此窗口，请手动关闭。');
        }
    }, 300);
});