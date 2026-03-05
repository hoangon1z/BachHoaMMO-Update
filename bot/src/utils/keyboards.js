// ==================== INLINE KEYBOARD BUILDERS ====================

/**
 * Main menu keyboard
 */
function mainMenu() {
    return {
        inline_keyboard: [
            [
                { text: '📘 Facebook', callback_data: 'menu_fb' },
            ],
            [
                { text: '🔍 Tìm kiếm', callback_data: 'menu_search' },
                { text: '📊 Thống kê', callback_data: 'menu_stats' },
            ],
            [
                { text: '👤 Tài khoản', callback_data: 'menu_profile' },
                { text: '❓ Trợ giúp', callback_data: 'menu_help' },
            ],
        ],
    };
}

/**
 * Facebook sub-menu (Profile only)
 */
function facebookMenu() {
    return {
        inline_keyboard: [
            [
                { text: '➕ Thêm Profile', callback_data: 'fb_add_guide' },
                { text: '📤 Upload hàng loạt', callback_data: 'fb_adds_guide' },
            ],
            [
                { text: '📋 Xem danh sách', callback_data: 'fb_list_all_1' },
                { text: '📊 Thống kê FB', callback_data: 'fb_stats' },
            ],
            [
                { text: '⬅️ Quay lại', callback_data: 'menu_main' },
            ],
        ],
    };
}

/**
 * Facebook list filter buttons (Profile only - no group/post filters)
 */
function fbListFilter(currentFilter, page) {
    return {
        inline_keyboard: [
            [
                { text: currentFilter === 'all' ? '📋 Tất cả ✓' : '📋 Tất cả', callback_data: `fb_list_all_${page}` },
                { text: currentFilter === 'live' ? '✅ Live ✓' : '✅ Live', callback_data: `fb_list_live_${page}` },
                { text: currentFilter === 'die' ? '❌ Die ✓' : '❌ Die', callback_data: `fb_list_die_${page}` },
            ],
            [
                { text: '⬅️ Menu FB', callback_data: 'menu_fb' },
            ],
        ],
    };
}

/**
 * Facebook list pagination
 */
function fbListPagination(filter, currentPage, totalPages) {
    const buttons = [];
    if (currentPage > 1) {
        buttons.push({ text: '◀️ Trước', callback_data: `fb_list_${filter}_${currentPage - 1}` });
    }
    buttons.push({ text: `${currentPage}/${totalPages}`, callback_data: 'noop' });
    if (currentPage < totalPages) {
        buttons.push({ text: 'Tiếp ▶️', callback_data: `fb_list_${filter}_${currentPage + 1}` });
    }
    return buttons;
}

/**
 * Facebook UID detail actions
 */
function fbDetailActions(id) {
    return {
        inline_keyboard: [
            [
                { text: '📝 Sửa ghi chú', callback_data: `fb_edit_note_${id}` },
                { text: '💰 Cập nhật giá', callback_data: `fb_edit_price_${id}` },
            ],
            [
                { text: '⏱️ Gia hạn', callback_data: `fb_extend_${id}` },
                { text: '🗑️ Xóa', callback_data: `fb_delete_confirm_${id}` },
            ],
            [
                { text: '⬅️ Quay lại', callback_data: 'fb_list_all_1' },
            ],
        ],
    };
}

/**
 * Delete confirmation keyboard
 */
function deleteConfirm(type, id) {
    return {
        inline_keyboard: [
            [
                { text: '✅ Xác nhận xóa', callback_data: `${type}_delete_yes_${id}` },
                { text: '❌ Hủy', callback_data: `${type}_list_all_1` },
            ],
        ],
    };
}

/**
 * Delete all confirmation keyboard
 */
function deleteAllConfirm(type) {
    return {
        inline_keyboard: [
            [
                { text: '⚠️ XÁC NHẬN XÓA TẤT CẢ', callback_data: `${type}_deleteall_yes` },
                { text: '❌ Hủy', callback_data: `menu_${type}` },
            ],
        ],
    };
}

/**
 * Search menu
 */
function searchMenu() {
    return {
        inline_keyboard: [
            [
                { text: '🔍 Tìm nhanh', callback_data: 'search_guide' },
                { text: '🤖 Tìm AI (VIP)', callback_data: 'searchai_guide' },
            ],
            [
                { text: '⬅️ Quay lại', callback_data: 'menu_main' },
            ],
        ],
    };
}

/**
 * Stats menu (Facebook only)
 */
function statsMenu() {
    return {
        inline_keyboard: [
            [
                { text: '📘 Thống kê Facebook', callback_data: 'fb_stats' },
            ],
            [
                { text: '⬅️ Quay lại', callback_data: 'menu_main' },
            ],
        ],
    };
}

/**
 * Profile menu
 */
function profileMenu(isVip) {
    const buttons = [
        [
            { text: '👤 Xem tài khoản', callback_data: 'profile_view' },
        ],
    ];

    if (!isVip) {
        buttons.push([
            { text: '⭐ Nâng cấp VIP', callback_data: 'profile_upgrade' },
        ]);
    } else {
        buttons.push([
            { text: '🤖 Bot con', callback_data: 'profile_subbot' },
        ]);
    }

    buttons.push([
        { text: '⬅️ Quay lại', callback_data: 'menu_main' },
    ]);

    return { inline_keyboard: buttons };
}

/**
 * Back to main menu only
 */
function backToMain() {
    return {
        inline_keyboard: [
            [{ text: '⬅️ Menu chính', callback_data: 'menu_main' }],
        ],
    };
}

module.exports = {
    mainMenu,
    facebookMenu,
    fbListFilter,
    fbListPagination,
    fbDetailActions,
    deleteConfirm,
    deleteAllConfirm,
    searchMenu,
    statsMenu,
    profileMenu,
    backToMain,
};
